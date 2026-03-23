import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useSaveApiKeyConnector, useSaveOAuthConnector } from "@/hooks/use-connectors";

const PROVIDERS = ["openai", "anthropic", "google", "ollama", "custom"] as const;

interface AddConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProvider?: string;
}

export function AddConnectorDialog({ open, onOpenChange, defaultProvider }: AddConnectorDialogProps) {
  const [provider, setProvider] = useState(defaultProvider ?? "");
  const [method, setMethod] = useState<"api_key" | "oauth">("api_key");
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const saveApiKey = useSaveApiKeyConnector();
  const saveOAuth = useSaveOAuthConnector();

  const isPending = saveApiKey.isPending || saveOAuth.isPending;

  function reset() {
    setProvider(defaultProvider ?? "");
    setMethod("api_key");
    setApiKey("");
    setAccessToken("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const onSuccess = () => {
      onOpenChange(false);
      reset();
    };

    if (method === "api_key") {
      saveApiKey.mutate({ provider, apiKey }, { onSuccess });
    } else {
      saveOAuth.mutate({ provider, accessToken }, { onSuccess });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Connector</DialogTitle>
          <DialogDescription>
            Connect to an AI provider to enable agent execution.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as "api_key" | "oauth")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api_key">API Key</SelectItem>
                <SelectItem value="oauth">OAuth Token</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {method === "api_key" ? (
            <div className="grid gap-2">
              <Label htmlFor="connector-api-key">API Key</Label>
              <Input
                id="connector-api-key"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="connector-access-token">Access Token</Label>
              <Input
                id="connector-access-token"
                type="password"
                placeholder="Token..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                required
              />
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending || !provider}>
              {isPending ? "Saving..." : "Save Connector"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
