import type { FastifyInstance } from "fastify";
import {
  GetProjectsByTeamQuery,
  CreateProjectCommand,
  GetProjectByIdQuery,
  GetTasksByProjectQuery,
  AddTaskToProjectCommand,
  StartStepCommand,
  CompleteStepCommand,
  MoveTaskToStepCommand,
} from "@hisse/runtime";
import { getWorkspaceFromRequest, createHandlers } from "../workspace.js";

export function registerProjectsRoutes(app: FastifyInstance) {
  app.get<{ Params: { teamId: string } }>(
    "/api/teams/:teamId/projects",
    async (request) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      const { teamId } = request.params;
      return handlers.getProjectsByTeam.execute(new GetProjectsByTeamQuery(teamId));
    },
  );

  app.post<{
    Params: { teamId: string };
    Body: { name: string; workflowId: string };
  }>("/api/teams/:teamId/projects", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { teamId } = request.params;
    const { name, workflowId } = request.body;
    try {
      await handlers.createProject.execute(new CreateProjectCommand(name, teamId, workflowId));
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/projects/:projectId — project detail with workflow
  app.get<{ Params: { projectId: string } }>("/api/projects/:projectId", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    try {
      return await handlers.getProjectById.execute(new GetProjectByIdQuery(request.params.projectId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) return reply.status(404).send({ error: message });
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/projects/:projectId/tasks — list tasks for a project
  app.get<{ Params: { projectId: string } }>("/api/projects/:projectId/tasks", async (request) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    return handlers.getTasksByProject.execute(new GetTasksByProjectQuery(request.params.projectId));
  });

  // POST /api/projects/:projectId/tasks — create a task in a project
  app.post<{ Params: { projectId: string }; Body: { name: string; description: string } }>(
    "/api/projects/:projectId/tasks",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      try {
        await handlers.addTaskToProject.execute(
          new AddTaskToProjectCommand(request.body.name, request.body.description, request.params.projectId),
        );
        return reply.status(201).send({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  // POST /api/tasks/:taskId/start — move task from backlog to a step
  app.post<{ Params: { taskId: string }; Body: { stepId: string; stepIndex: number } }>(
    "/api/tasks/:taskId/start",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      try {
        await handlers.startStep.execute(new StartStepCommand(request.params.taskId, request.body.stepId, request.body.stepIndex));
        return reply.status(200).send({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  // POST /api/tasks/:taskId/complete — complete a task
  app.post<{ Params: { taskId: string } }>(
    "/api/tasks/:taskId/complete",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      try {
        await handlers.completeStep.execute(new CompleteStepCommand(request.params.taskId));
        return reply.status(200).send({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  // POST /api/tasks/:taskId/move — move a task to another step
  app.post<{ Params: { taskId: string }; Body: { stepId: string; stepIndex: number } }>(
    "/api/tasks/:taskId/move",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      try {
        await handlers.moveTaskToStep.execute(new MoveTaskToStepCommand(request.params.taskId, request.body.stepId, request.body.stepIndex));
        return reply.status(200).send({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );
}
