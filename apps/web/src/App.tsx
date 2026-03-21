import { useEffect, useMemo, useState } from "react";
import {
  BotIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";

interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  model: string;
  provider: "anthropic" | "openai" | "google" | "custom";
}

interface ModelOption {
  id: string;
  provider: string;
  label: string;
}

type View = "agents" | "agents:create";

export function App() {
  const [view, setView] = useState<View>("agents");
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    model: "",
    systemPrompt: "",
  });

  useEffect(() => {
    void loadPageData();
  }, []);

  useEffect(() => {
    if (!form.model && models.length > 0) {
      setForm((current) => ({ ...current, model: models[0]!.id }));
    }
  }, [models, form.model]);

  const currentModel = useMemo(
    () => models.find((model) => model.id === form.model),
    [models, form.model],
  );

  async function loadPageData() {
    setLoading(true);
    setError(null);

    try {
      const [agentsResponse, modelsResponse] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/models"),
      ]);

      if (!agentsResponse.ok) throw new Error(`Agents: HTTP ${agentsResponse.status}`);
      if (!modelsResponse.ok) throw new Error(`Models: HTTP ${modelsResponse.status}`);

      const agentsPayload = (await agentsResponse.json()) as { items: AgentDefinition[] };
      const modelsPayload = (await modelsResponse.json()) as { items: ModelOption[] };

      setAgents(agentsPayload.items);
      setModels(modelsPayload.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          model: form.model,
          systemPrompt: form.systemPrompt,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { item: AgentDefinition };
      setAgents((current) => [payload.item, ...current]);
      setForm((current) => ({ ...current, name: "", description: "", systemPrompt: "" }));
      setView("agents");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <SparklesIcon />
            </div>
            <div className="grid min-w-0 flex-1 text-left">
              <span className="truncate font-medium">Hisse</span>
              <span className="truncate text-xs text-sidebar-foreground/70">Agent factory</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={view === "agents" || view === "agents:create"}
                    onClick={() => setView("agents")}
                    tooltip="Agents"
                  >
                    <BotIcon />
                    <span>Agents</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="rounded-lg border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/70">
            {agents.length} agent{agents.length > 1 ? "s" : ""}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <main className="flex min-h-svh flex-col gap-6 p-6">
          <header className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {view === "agents" ? "Agents" : "Create agent"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {view === "agents"
                  ? "Create and manage your specialist agents."
                  : "Configure a model and a system prompt for a new agent."}
              </p>
            </div>

            {view === "agents" ? (
              <Button onClick={() => setView("agents:create")}> 
                <PlusIcon data-icon="inline-start" />
                New agent
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setView("agents")}>Back to agents</Button>
            )}
          </header>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>API error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {view === "agents" ? (
            <section className="flex flex-col gap-4">
              {loading ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Loading</CardTitle>
                    <CardDescription>Fetching agents from the API.</CardDescription>
                  </CardHeader>
                </Card>
              ) : agents.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <BotIcon />
                    </EmptyMedia>
                    <EmptyTitle>Create your first agent</EmptyTitle>
                    <EmptyDescription>
                      Start by defining a model and a system prompt.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button onClick={() => setView("agents:create")}> 
                      <PlusIcon data-icon="inline-start" />
                      Create agent
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {agents.map((agent) => (
                    <Card key={agent.id}>
                      <CardHeader>
                        <CardTitle>{agent.name}</CardTitle>
                        <CardDescription>
                          {agent.description || "No description provided."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{agent.provider}</Badge>
                          <Badge variant="outline">{agent.model}</Badge>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                          {agent.systemPrompt}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Agent definition</CardTitle>
                <CardDescription>
                  Minimal setup: name, model, description, and system prompt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-6" onSubmit={handleCreateAgent}>
                  <div className="grid gap-2">
                    <Label htmlFor="agent-name">Name</Label>
                    <Input
                      id="agent-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="PRD Agent"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="agent-description">Description</Label>
                    <Textarea
                      id="agent-description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Writes structured product requirement documents."
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="agent-model">Model</Label>
                    <Select
                      value={form.model}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, model: value }))
                      }
                    >
                      <SelectTrigger id="agent-model" className="w-full">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent position="popper" align="start">
                        <SelectGroup>
                          <SelectLabel>Available models</SelectLabel>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {currentModel ? (
                      <p className="text-xs text-muted-foreground">
                        Provider: {currentModel.provider} · {currentModel.id}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="agent-prompt">System prompt</Label>
                    <Textarea
                      id="agent-prompt"
                      value={form.systemPrompt}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, systemPrompt: event.target.value }))
                      }
                      placeholder="You are a senior product manager..."
                      rows={12}
                    />
                  </div>

                  {submitError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Creation failed</AlertTitle>
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex items-center justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setView("agents")}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      <ChevronsUpDownIcon data-icon="inline-start" />
                      {submitting ? "Creating..." : "Create agent"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
