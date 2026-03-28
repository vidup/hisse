import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { getWorkspacePath, setWorkspacePath } from "@/lib/api";

interface WorkspaceContextValue {
  currentPath: string;
  recentPaths: string[];
  isChanging: boolean;
  canSwitch: boolean;
  pickWorkspace: () => Promise<void>;
  switchWorkspace: (path: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function dedupeWorkspacePaths(paths: string[]): string[] {
  return paths.filter((candidate, index) => {
    const normalizedCandidate = candidate.toLowerCase();
    return paths.findIndex((value) => value.toLowerCase() === normalizedCandidate) === index;
  });
}

function normalizeWorkspaceSnapshot(snapshot: WorkspaceStateSnapshot): WorkspaceStateSnapshot {
  const currentPath = snapshot.currentPath?.trim() ?? "";
  const recentPaths = dedupeWorkspacePaths(
    [currentPath, ...snapshot.recentPaths]
      .map((candidate) => candidate.trim())
      .filter(Boolean),
  );

  return {
    currentPath,
    recentPaths,
  };
}

function getInitialWorkspaceSnapshot(): WorkspaceStateSnapshot {
  const currentPath = getWorkspacePath() ?? "";
  return currentPath
    ? { currentPath, recentPaths: [currentPath] }
    : { currentPath: "", recentPaths: [] };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceStateSnapshot>(
    getInitialWorkspaceSnapshot,
  );
  const [isChanging, setIsChanging] = useState(false);

  const applyWorkspaceSnapshot = useCallback((snapshot: WorkspaceStateSnapshot) => {
    const nextSnapshot = normalizeWorkspaceSnapshot(snapshot);
    setWorkspacePath(nextSnapshot.currentPath);
    setWorkspaceSnapshot(nextSnapshot);
  }, []);

  useEffect(() => {
    if (!window.electron?.getWorkspaceState) return;

    let active = true;

    void window.electron.getWorkspaceState().then((snapshot) => {
      if (!active) return;
      applyWorkspaceSnapshot(snapshot);
    });

    return () => {
      active = false;
    };
  }, [applyWorkspaceSnapshot]);

  const navigateToWorkspaceHome = useCallback(() => {
    startTransition(() => {
      navigate("/chat", { replace: true });
    });
  }, [navigate]);

  const finalizeWorkspaceSwitch = useCallback(
    async (snapshot: WorkspaceStateSnapshot) => {
      applyWorkspaceSnapshot(snapshot);
      await queryClient.cancelQueries();
      queryClient.clear();
      navigateToWorkspaceHome();
    },
    [applyWorkspaceSnapshot, navigateToWorkspaceHome, queryClient],
  );

  const pickWorkspace = useCallback(async () => {
    if (!window.electron?.changeWorkspace) return;

    setIsChanging(true);
    try {
      const nextSnapshot = await window.electron.changeWorkspace();
      if (!nextSnapshot) return;
      await finalizeWorkspaceSwitch(nextSnapshot);
    } catch (error) {
      console.error("Failed to change workspace", error);
    } finally {
      setIsChanging(false);
    }
  }, [finalizeWorkspaceSwitch]);

  const switchWorkspace = useCallback(
    async (path: string) => {
      if (!window.electron?.switchWorkspace || path === workspaceSnapshot.currentPath) return;

      setIsChanging(true);
      try {
        const nextSnapshot = await window.electron.switchWorkspace(path);
        await finalizeWorkspaceSwitch(nextSnapshot);
      } catch (error) {
        console.error("Failed to switch workspace", error);
      } finally {
        setIsChanging(false);
      }
    },
    [finalizeWorkspaceSwitch, workspaceSnapshot.currentPath],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      currentPath: workspaceSnapshot.currentPath,
      recentPaths: workspaceSnapshot.recentPaths,
      isChanging,
      canSwitch: !!window.electron,
      pickWorkspace,
      switchWorkspace,
    }),
    [isChanging, pickWorkspace, switchWorkspace, workspaceSnapshot],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}
