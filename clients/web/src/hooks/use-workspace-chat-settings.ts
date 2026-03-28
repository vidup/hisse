import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useWorkspaceChatSettings() {
  return useQuery({
    queryKey: ["workspace-settings", "chat"],
    queryFn: api.workspaceSettings.getChat,
  });
}

export function useUpdateWorkspaceChatSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { defaultChatAgentId: string | null }) =>
      api.workspaceSettings.updateChat(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["workspace-settings", "chat"] }),
  });
}
