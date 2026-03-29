import type { MouseEvent } from "react";
import { Code2Icon, FolderOpenIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ToolPathActionsProps {
  targetPath: string;
  folderPath?: string;
  disabled?: boolean;
  size?: "xs" | "sm";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown desktop integration error";
}

export function ToolPathActions({
  targetPath,
  folderPath,
  disabled = false,
  size = "sm",
}: ToolPathActionsProps) {
  const canUseDesktopActions = !!window.electron && !disabled;

  const runDesktopAction = async (
    event: MouseEvent<HTMLButtonElement>,
    action: () => Promise<unknown>,
    label: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUseDesktopActions) return;

    try {
      await action();
    } catch (error) {
      window.alert(`Could not open ${label}.\n\n${getErrorMessage(error)}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={!canUseDesktopActions}
        onClick={(event) =>
          runDesktopAction(
            event,
            () => window.electron!.openInEditor("vscode", targetPath),
            "in VS Code",
          )
        }
      >
        <Code2Icon />
        VS Code
      </Button>

      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={!canUseDesktopActions}
        onClick={(event) =>
          runDesktopAction(
            event,
            () => window.electron!.openInEditor("cursor", targetPath),
            "in Cursor",
          )
        }
      >
        <Code2Icon />
        Cursor
      </Button>

      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={!canUseDesktopActions}
        onClick={(event) =>
          runDesktopAction(
            event,
            () => window.electron!.openInFileManager(folderPath ?? targetPath),
            "in Explorer",
          )
        }
      >
        <FolderOpenIcon />
        Explorer
      </Button>
    </div>
  );
}
