import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useWorkflows() {
  return useQuery({ queryKey: ["workflows"], queryFn: api.workflows.list });
}

export function useWorkflow(id: string) {
  return useQuery({ queryKey: ["workflows", id], queryFn: () => api.workflows.getById(id) });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.workflows.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflows"] }),
  });
}

export function useUpdateWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { steps: string[] }) => api.workflows.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflows", id] });
    },
  });
}
