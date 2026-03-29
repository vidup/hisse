import type { FastifyInstance } from "fastify";
import {
  AddTaskToProjectCommand,
  CompleteStepCommand,
  CreateProjectCommand,
  GetProjectByIdQuery,
  GetProjectsListQuery,
  GetTasksByProjectQuery,
  MoveTaskToStepCommand,
  StartStepCommand,
  UpdateProjectWorkflowCommand,
} from "@hisse/runtime";
import { createHandlers, getWorkspaceFromRequest } from "../workspace.js";

export function registerProjectsRoutes(app: FastifyInstance) {
  app.get("/api/projects", async (request) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    return handlers.getProjectsList.execute(new GetProjectsListQuery());
  });

  app.post<{
    Body: {
      name: string;
      description?: string;
    };
  }>("/api/projects", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    const { name, description } = request.body;
    try {
      await handlers.createProject.execute(new CreateProjectCommand(name, description));
      return reply.status(201).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  app.put<{
    Params: { projectId: string };
    Body: {
      steps: Array<
        | { kind: "agent"; name: string; description?: string; agentId: string }
        | {
            kind: "human";
            name: string;
            description?: string;
            transports: Array<{
              type: string;
              target: string;
              configuration: Record<string, unknown>;
              authenticated: boolean;
            }>;
          }
      >;
    };
  }>("/api/projects/:projectId/workflow", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    try {
      await handlers.updateProjectWorkflow.execute(
        new UpdateProjectWorkflowCommand(request.params.projectId, request.body.steps),
      );
      return reply.status(200).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  app.get<{ Params: { projectId: string } }>("/api/projects/:projectId", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    try {
      return await handlers.getProjectById.execute(new GetProjectByIdQuery(request.params.projectId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("not found")) {
        return reply.status(404).send({ error: message });
      }
      return reply.status(400).send({ error: message });
    }
  });

  app.get<{ Params: { projectId: string } }>("/api/projects/:projectId/tasks", async (request) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    return handlers.getTasksByProject.execute(new GetTasksByProjectQuery(request.params.projectId));
  });

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

  app.post<{ Params: { taskId: string }; Body: { stepId: string } }>(
    "/api/tasks/:taskId/start",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      try {
        await handlers.startStep.execute(new StartStepCommand(request.params.taskId, request.body.stepId));
        return reply.status(200).send({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  app.post<{ Params: { taskId: string } }>("/api/tasks/:taskId/complete", async (request, reply) => {
    const workspacePath = getWorkspaceFromRequest(request);
    const handlers = await createHandlers(workspacePath);
    try {
      await handlers.completeStep.execute(new CompleteStepCommand(request.params.taskId));
      return reply.status(200).send({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({ error: message });
    }
  });

  app.post<{ Params: { taskId: string }; Body: { stepId: string } }>(
    "/api/tasks/:taskId/move",
    async (request, reply) => {
      const workspacePath = getWorkspaceFromRequest(request);
      const handlers = await createHandlers(workspacePath);
      try {
        await handlers.moveTaskToStep.execute(new MoveTaskToStepCommand(request.params.taskId, request.body.stepId));
        return reply.status(200).send({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return reply.status(400).send({ error: message });
      }
    },
  );
}
