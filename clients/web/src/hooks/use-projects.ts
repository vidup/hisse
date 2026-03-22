import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useProjects(teamId: string) {
  return useQuery({ queryKey: ["projects", teamId], queryFn: () => api.projects.listByTeam(teamId) });
}

export function useCreateProject(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; path: string; workflowId: string }) => api.projects.create(teamId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects", teamId] }),
  });
}
