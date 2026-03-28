import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useWorkspaceImportPreview(sourceWorkspacePath: string | null, enabled = true) {
  return useQuery({
    queryKey: ["workspace-import-preview", sourceWorkspacePath],
    queryFn: () => api.workspaceImport.preview(sourceWorkspacePath!),
    enabled: enabled && !!sourceWorkspacePath,
  });
}

export function useImportWorkspaceContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      sourceWorkspacePath: string;
      agentIds: string[];
      skillIds: string[];
      toolNames: string[];
    }) => api.workspaceImport.import(body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: ["skills"] }),
        queryClient.invalidateQueries({ queryKey: ["tools"] }),
      ]);
    },
  });
}
