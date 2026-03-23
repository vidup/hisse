import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProjects(teamId: string) {
  return useQuery({ queryKey: ["projects", teamId], queryFn: () => api.projects.listByTeam(teamId) });
}

export function useCreateProject(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; workflowId: string }) => api.projects.create(teamId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", teamId] }),
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
    mutationFn: ({ taskId, stepId, stepIndex }: { taskId: string; stepId: string; stepIndex: number }) => api.tasks.start(taskId, { stepId, stepIndex }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, stepId, stepIndex }: { taskId: string; stepId: string; stepIndex: number }) => api.tasks.move(taskId, { stepId, stepIndex }),
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
