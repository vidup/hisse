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

async function buildWorkspacePreview(sourceWorkspacePath: string) {
  const ws = resolveWorkspace(sourceWorkspacePath);
  const skillsRepo = new FsSkillsRepository(ws.skills);
  const agentsRepo = new FsAgentsRepository(ws.agents);
  const toolsRepo = new FsToolsRepository(ws.tools);

  await skillsRepo.preload();

  const [skills, agents, tools] = await Promise.all([
    skillsRepo.findAllByWorkspaceId(DEFAULT_WORKSPACE_ID),
    agentsRepo.finAllByWorkspaceId(DEFAULT_WORKSPACE_ID),
    toolsRepo.findAll(),
  ]);

  return {
    sourceWorkspacePath,
    agents: agents
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        provider: agent.provider,
        model: agent.model,
        skillIds: [...agent.skills],
        toolNames: [...agent.tools],
      }))
      .sort(compareByName),
    skills: skills
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
      }))
      .sort(compareByName),
    tools: tools.map((tool) => ({ name: tool.name })).sort(compareByName),
  };
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
      const { sourceWorkspacePath } = request.body;

      if (!sourceWorkspacePath) {
        return reply.status(400).send({ error: "sourceWorkspacePath is required" });
      }

      try {
        return await buildWorkspacePreview(sourceWorkspacePath);
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
