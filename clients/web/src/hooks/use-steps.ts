import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useStepsLibrary() {
  return useQuery({ queryKey: ["steps"], queryFn: api.steps.list });
}

export function useCreateStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.steps.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["steps"] }),
  });
}
