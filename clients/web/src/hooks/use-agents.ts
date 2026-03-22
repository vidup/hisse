import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAgents() {
  return useQuery({ queryKey: ["agents"], queryFn: api.agents.list });
}

export function useAgentConfig(id: string) {
  return useQuery({ queryKey: ["agents", id, "config"], queryFn: () => api.agents.getConfig(id) });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.agents.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}
