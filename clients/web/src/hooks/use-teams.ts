import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: api.teams.list });
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
