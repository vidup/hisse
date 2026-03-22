import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: api.teams.list });
}

export function useTeamWorkflow(id: string) {
  return useQuery({ queryKey: ["teams", id, "workflow"], queryFn: () => api.teams.getWorkflow(id) });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.teams.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
  });
}

export function useBrowseFolders(path?: string) {
  return useQuery({
    queryKey: ["folders", path ?? "home"],
    queryFn: () => api.teams.browseFolders(path),
  });
}

export function useUpdateWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { steps: string[] }) => api.teams.updateWorkflow(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["teams", id, "workflow"] });
    },
  });
}
