import { Link } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  action?: ReactNode;
}

function PageHeader({ title, backTo, action }: PageHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
      <div className="flex items-center gap-4">
        {backTo && (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={backTo}>
              <ArrowLeftIcon />
            </Link>
          </Button>
        )}
        <h1 className="font-heading text-xl font-semibold">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

interface PageLayoutProps {
  title: string;
  backTo?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageLayout({ title, backTo, action, children }: PageLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={title} backTo={backTo} action={action} />
      <div className="min-h-0 flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}

interface PageLayoutWithPanelProps {
  title: string;
  backTo?: string;
  action?: ReactNode;
  children: ReactNode;
  panel: ReactNode;
}

export function PageLayoutWithPanel({ title, backTo, action, children, panel }: PageLayoutWithPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={title} backTo={backTo} action={action} />
      <div className="flex min-h-0 flex-1">
        <div className="flex-1 overflow-auto p-6">{children}</div>
        <aside className="w-80 shrink-0 overflow-auto border-l border-border p-4">
          {panel}
        </aside>
      </div>
    </div>
  );
}
