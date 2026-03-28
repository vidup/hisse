import { createContext, useContext, useState, type ReactNode } from "react";

interface RightPanelContextValue {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

export function useRightPanel() {
  const ctx = useContext(RightPanelContext);
  if (!ctx) throw new Error("useRightPanel must be used within RightPanelProvider");
  return ctx;
}

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);

  return <RightPanelContext value={{ content, setContent }}>{children}</RightPanelContext>;
}

export function RightPanel() {
  const { content } = useRightPanel();

  if (!content) return null;

  return (
    <aside className="hidden min-h-0 w-80 shrink-0 overflow-hidden border-l border-border lg:block">
      <div className="h-full overflow-hidden p-4">{content}</div>
    </aside>
  );
}
