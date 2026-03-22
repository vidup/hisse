import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTools() {
  return useQuery({ queryKey: ["tools"], queryFn: api.tools.list });
}

export function useTool(name: string) {
  return useQuery({ queryKey: ["tools", name], queryFn: () => api.tools.getByName(name) });
}
