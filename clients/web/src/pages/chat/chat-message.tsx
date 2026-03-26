import { BotIcon, UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  agentName?: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, agentName, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

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
          ) : (
            <Streamdown plugins={plugins} components={components} isAnimating={isStreaming}>
              {content}
            </Streamdown>
          )}
        </div>
      </div>
    </div>
  );
}
