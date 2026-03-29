import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type ProjectCreateInput,
  type UpdateProjectWorkflowInput,
} from "@/lib/api";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: api.projects.list });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectCreateInput) => api.projects.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.getById(projectId),
  });
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ["projects", projectId, "tasks"],
    queryFn: () => api.projects.getTasks(projectId),
  });
}

export function useUpdateProjectWorkflow(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProjectWorkflowInput) => api.projects.updateWorkflow(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", projectId] });
    },
  });
}

export function useAddTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description: string }) => api.projects.addTask(projectId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", projectId, "tasks"] }),
  });
}

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, stepId }: { taskId: string; stepId: string }) => api.tasks.start(taskId, { stepId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, stepId }: { taskId: string; stepId: string }) => api.tasks.move(taskId, { stepId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.tasks.complete(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
