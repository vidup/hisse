import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useConnectors() {
  return useQuery({ queryKey: ["connectors"], queryFn: api.connectors.list });
}

export function useSaveApiKeyConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.connectors.saveApiKey,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });
}

export function useSaveOAuthConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.connectors.saveOAuth,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });
}

export function useRemoveConnector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.connectors.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });
}
