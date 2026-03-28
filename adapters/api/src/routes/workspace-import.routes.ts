import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import {
  type Agent,
  CreateAgentCommand,
  CreateAgentCommandHandler,
  CreateSkillCommand,
  CreateSkillCommandHandler,
  FsAgentsRepository,
  FsSkillsRepository,
  FsToolsRepository,
} from "@hisse/runtime";
import { getWorkspaceFromRequest, resolveWorkspace } from "../workspace.js";

const DEFAULT_WORKSPACE_ID = "default";
type ImportPreviewStatus = "new" | "conflict";

function normalizeWorkspacePath(workspacePath: string): string {
  const normalized = path.resolve(workspacePath);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function sameWorkspace(sourceWorkspacePath: string, targetWorkspacePath: string): boolean {
  return normalizeWorkspacePath(sourceWorkspacePath) === normalizeWorkspacePath(targetWorkspacePath);
}

function compareByName<T extends { name: string }>(left: T, right: T): number {
  return left.name.localeCompare(right.name);
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPreviewStatus(hasConflict: boolean): ImportPreviewStatus {
  return hasConflict ? "conflict" : "new";
}

async function buildWorkspacePreview(sourceWorkspacePath: string, targetWorkspacePath: string) {
  const sourceWorkspace = resolveWorkspace(sourceWorkspacePath);
  const targetWorkspace = resolveWorkspace(targetWorkspacePath);

  const sourceSkillsRepo = new FsSkillsRepository(sourceWorkspace.skills);
  const sourceAgentsRepo = new FsAgentsRepository(sourceWorkspace.agents);
  const sourceToolsRepo = new FsToolsRepository(sourceWorkspace.tools);

  const targetSkillsRepo = new FsSkillsRepository(targetWorkspace.skills);
  const targetAgentsRepo = new FsAgentsRepository(targetWorkspace.agents);
  const targetToolsRepo = new FsToolsRepository(targetWorkspace.tools);

  const [sourceSkills, sourceAgents, sourceTools, targetSkills, targetAgents, targetTools] =
    await Promise.all([
      sourceSkillsRepo.findAllByWorkspaceId(DEFAULT_WORKSPACE_ID),
      sourceAgentsRepo.finAllByWorkspaceId(DEFAULT_WORKSPACE_ID),
      sourceToolsRepo.findAll(),
      targetSkillsRepo.findAllByWorkspaceId(DEFAULT_WORKSPACE_ID),
      targetAgentsRepo.finAllByWorkspaceId(DEFAULT_WORKSPACE_ID),
      targetToolsRepo.findAll(),
    ]);

  const sourceSkillsById = new Map(sourceSkills.map((skill) => [skill.id, skill]));
  const targetSkillSlugs = new Set(targetSkills.map((skill) => slugifyName(skill.name)));
  const targetAgentSlugs = new Set(targetAgents.map((agent) => slugifyName(agent.name)));
  const targetToolNames = new Set(targetTools.map((tool) => tool.name));

  return {
    sourceWorkspacePath,
    agents: sourceAgents
      .map((agent) => {
        const conflictReasons = new Set<string>();

        if (targetAgentSlugs.has(slugifyName(agent.name))) {
          conflictReasons.add(`Agent "${agent.name}" already exists in the current workspace.`);
        }

        for (const skillId of agent.skills) {
          const skill = sourceSkillsById.get(skillId);
          if (skill && targetSkillSlugs.has(slugifyName(skill.name))) {
            conflictReasons.add(
              `Requires skill "${skill.name}" which already exists in the current workspace.`,
            );
          }
        }

        for (const toolName of agent.tools) {
          if (targetToolNames.has(toolName)) {
            conflictReasons.add(
              `Requires tool "${toolName}" which already exists in the current workspace.`,
            );
          }
        }

        return {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          provider: agent.provider,
          model: agent.model,
          skillIds: [...agent.skills],
          toolNames: [...agent.tools],
          status: getPreviewStatus(conflictReasons.size > 0),
          conflictReasons: [...conflictReasons],
        };
      })
      .sort(compareByName),
    skills: sourceSkills
      .map((skill) => {
        const conflictReason = targetSkillSlugs.has(slugifyName(skill.name))
          ? `Skill "${skill.name}" already exists in the current workspace.`
          : undefined;

        return {
          id: skill.id,
          name: skill.name,
          description: skill.description,
          status: getPreviewStatus(!!conflictReason),
          conflictReason,
        };
      })
      .sort(compareByName),
    tools: sourceTools
      .map((tool) => {
        const conflictReason = targetToolNames.has(tool.name)
          ? `Tool "${tool.name}" already exists in the current workspace.`
          : undefined;

        return {
          name: tool.name,
          status: getPreviewStatus(!!conflictReason),
          conflictReason,
        };
      })
      .sort(compareByName),
  };
}

function collectConflictLabels(
  selectedAgents: Array<{ name: string }>,
  selectedSkills: Array<{ name: string }>,
  selectedTools: Array<{ name: string }>,
) {
  const labels = new Set<string>();

  for (const agent of selectedAgents) {
    labels.add(`agent "${agent.name}"`);
  }

  for (const skill of selectedSkills) {
    labels.add(`skill "${skill.name}"`);
  }

  for (const tool of selectedTools) {
    labels.add(`tool "${tool.name}"`);
  }

  return [...labels];
}

async function copyToolDirectory(sourcePath: string, targetToolsRoot: string, toolName: string) {
  const targetPath = path.join(targetToolsRoot, toolName);
  await mkdir(targetToolsRoot, { recursive: true });
  await rm(targetPath, { recursive: true, force: true });
  await cp(sourcePath, targetPath, { recursive: true, force: true });
}

export function registerWorkspaceImportRoutes(app: FastifyInstance) {
  app.post<{ Body: { sourceWorkspacePath: string } }>(
    "/api/workspace-import/preview",
    async (request, reply) => {
      const targetWorkspacePath = getWorkspaceFromRequest(request);
      const { sourceWorkspacePath } = request.body;

      if (!sourceWorkspacePath) {
        return reply.status(400).send({ error: "sourceWorkspacePath is required" });
      }

      if (sameWorkspace(sourceWorkspacePath, targetWorkspacePath)) {
        return reply.status(400).send({ error: "Source and target workspace must be different" });
      }

      try {
        return await buildWorkspacePreview(sourceWorkspacePath, targetWorkspacePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  app.post<{
    Body: {
      sourceWorkspacePath: string;
      agentIds?: string[];
      skillIds?: string[];
      toolNames?: string[];
    };
  }>("/api/workspace-import", async (request, reply) => {
    const targetWorkspacePath = getWorkspaceFromRequest(request);
    const {
      sourceWorkspacePath,
      agentIds = [],
      skillIds = [],
      toolNames = [],
    } = request.body;

    if (!sourceWorkspacePath) {
      return reply.status(400).send({ error: "sourceWorkspacePath is required" });
    }

    if (sameWorkspace(sourceWorkspacePath, targetWorkspacePath)) {
      return reply.status(400).send({ error: "Source and target workspace must be different" });
    }

    const sourceWorkspace = resolveWorkspace(sourceWorkspacePath);
    const targetWorkspace = resolveWorkspace(targetWorkspacePath);

    const sourceSkillsRepo = new FsSkillsRepository(sourceWorkspace.skills);
    const sourceAgentsRepo = new FsAgentsRepository(sourceWorkspace.agents);
    const sourceToolsRepo = new FsToolsRepository(sourceWorkspace.tools);

    const targetSkillsRepo = new FsSkillsRepository(targetWorkspace.skills);
    const targetAgentsRepo = new FsAgentsRepository(targetWorkspace.agents);

    const createSkill = new CreateSkillCommandHandler(targetSkillsRepo);
    const createAgent = new CreateAgentCommandHandler(targetAgentsRepo);

    await sourceSkillsRepo.preload();

    const selectedSkillIds = new Set(skillIds);
    const selectedToolNames = new Set(toolNames);
    const selectedAgents: Agent[] = [];

    try {
      const preview = await buildWorkspacePreview(sourceWorkspacePath, targetWorkspacePath);
      const previewAgentsById = new Map(preview.agents.map((agent) => [agent.id, agent]));
      const previewSkillsById = new Map(preview.skills.map((skill) => [skill.id, skill]));
      const previewToolsByName = new Map(preview.tools.map((tool) => [tool.name, tool]));

      for (const agentId of agentIds) {
        const agent = await sourceAgentsRepo.findById(agentId);
        selectedAgents.push(agent);

        for (const skillId of agent.skills) {
          selectedSkillIds.add(skillId);
        }

        for (const toolName of agent.tools) {
          selectedToolNames.add(toolName);
        }
      }

      const conflictingAgents = selectedAgents
        .map((agent) => previewAgentsById.get(agent.id))
        .filter((agent): agent is NonNullable<typeof agent> => agent?.status === "conflict");
      const conflictingSkills = [...selectedSkillIds]
        .map((skillId) => previewSkillsById.get(skillId))
        .filter((skill): skill is NonNullable<typeof skill> => skill?.status === "conflict");
      const conflictingTools = [...selectedToolNames]
        .map((toolName) => previewToolsByName.get(toolName))
        .filter((tool): tool is NonNullable<typeof tool> => tool?.status === "conflict");

      const conflictLabels = collectConflictLabels(
        conflictingAgents,
        conflictingSkills,
        conflictingTools,
      );

      if (conflictLabels.length > 0) {
        return reply.status(400).send({
          error: `Import blocked because these items already exist in the current workspace: ${conflictLabels.join(", ")}`,
        });
      }

      const skillIdMap = new Map<string, string>();

      for (const skillId of selectedSkillIds) {
        const skill = await sourceSkillsRepo.findById(skillId);
        if (!skill) {
          throw new Error(`Skill not found in source workspace: ${skillId}`);
        }

        const createdSkillId = await createSkill.execute(
          new CreateSkillCommand(skill.name, skill.description, skill.skillContent),
        );
        skillIdMap.set(skillId, createdSkillId);
      }

      for (const toolName of selectedToolNames) {
        const tool = await sourceToolsRepo.findByName(toolName);
        if (!tool) {
          throw new Error(`Tool not found in source workspace: ${toolName}`);
        }

        await copyToolDirectory(tool.codePath, targetWorkspace.tools, tool.name);
      }

      for (const agent of selectedAgents) {
        const remappedSkillIds = agent.skills.map((skillId) => {
          const targetSkillId = skillIdMap.get(skillId);
          if (!targetSkillId) {
            throw new Error(`Missing imported skill mapping for agent dependency: ${skillId}`);
          }
          return targetSkillId;
        });

        await createAgent.execute(
          new CreateAgentCommand(
            DEFAULT_WORKSPACE_ID,
            agent.name,
            agent.description,
            agent.systemPrompt,
            agent.provider,
            agent.model,
            [...agent.tools],
            remappedSkillIds,
          ),
        );
      }

      return reply.status(201).send({
        ok: true,
        importedAgents: selectedAgents.length,
        importedSkills: selectedSkillIds.size,
        importedTools: selectedToolNames.size,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });
}
