import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSkills() {
  return useQuery({ queryKey: ["skills"], queryFn: api.skills.list });
}

export function useSkill(id: string) {
  return useQuery({ queryKey: ["skills", id], queryFn: () => api.skills.getById(id) });
}

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.skills.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useUpdateSkill(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description: string; content: string }) =>
      api.skills.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["skills", id] });
    },
  });
}
