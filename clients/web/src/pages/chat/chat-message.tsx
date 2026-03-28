import { BotIcon, UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgentMessageActivitySummary } from "@/lib/api";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import "streamdown/styles.css";

const plugins = { code, math, mermaid };

const components = {
  ul: ({ children, className }: any) => (
    <ul className={`my-2 ml-6 list-disc space-y-1 ${className ?? ""}`}>{children}</ul>
  ),
  ol: ({ children, className }: any) => (
    <ol className={`my-2 ml-6 list-decimal space-y-1 ${className ?? ""}`}>{children}</ol>
  ),
  li: ({ children, className }: any) => (
    <li className={`${className ?? ""}`}>{children}</li>
  ),
  h1: ({ children, className }: any) => (
    <h1 className={`mt-6 mb-2 text-2xl font-bold ${className ?? ""}`}>{children}</h1>
  ),
  h2: ({ children, className }: any) => (
    <h2 className={`mt-5 mb-2 text-xl font-semibold ${className ?? ""}`}>{children}</h2>
  ),
  h3: ({ children, className }: any) => (
    <h3 className={`mt-4 mb-1 text-lg font-semibold ${className ?? ""}`}>{children}</h3>
  ),
  p: ({ children, className }: any) => (
    <p className={`my-2 leading-relaxed ${className ?? ""}`}>{children}</p>
  ),
  blockquote: ({ children, className }: any) => (
    <blockquote className={`my-2 border-l-2 border-muted-foreground/30 pl-4 italic ${className ?? ""}`}>{children}</blockquote>
  ),
};

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  activities?: AgentMessageActivitySummary[];
  agentName?: string;
  isStreaming?: boolean;
  loadingLabel?: string;
}

export function ChatMessage({ role, content, activities = [], agentName, isStreaming, loadingLabel }: ChatMessageProps) {
  const isUser = role === "user";
  const showLoadingState = !isUser && !!loadingLabel && content.length === 0 && activities.length === 0;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? <UserIcon className="size-4" /> : <BotIcon className="size-4" />}
      </div>
      <div className={`max-w-[80%] space-y-1 ${isUser ? "text-right" : ""}`}>
        {!isUser && agentName && (
          <Badge variant="secondary" className="text-xs">
            {agentName}
          </Badge>
        )}
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : showLoadingState ? (
            <div className="space-y-2 text-muted-foreground">
              <p className="text-sm">{loadingLabel}</p>
              <div className="flex items-center gap-1" aria-hidden="true">
                <span className="size-2 rounded-full bg-current opacity-40 animate-pulse" />
                <span
                  className="size-2 rounded-full bg-current opacity-40 animate-pulse"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="size-2 rounded-full bg-current opacity-40 animate-pulse"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {content.length > 0 && (
                <Streamdown plugins={plugins} components={components} isAnimating={isStreaming}>
                  {content}
                </Streamdown>
              )}

              {activities.length > 0 && (
                <div className="space-y-2 border-t border-border/60 pt-2">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate text-foreground/80">{activity.label}</span>
                      <Badge
                        variant="outline"
                        className={
                          activity.status === "failed"
                            ? "border-red-500/40 text-red-700"
                            : activity.status === "completed"
                              ? "border-emerald-500/40 text-emerald-700"
                              : "border-amber-500/40 text-amber-700"
                        }
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {loadingLabel && content.length === 0 && activities.length > 0 && (
                <p className="text-xs text-muted-foreground">{loadingLabel}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
