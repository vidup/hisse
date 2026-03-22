import { useEffect, useState } from "react";
import { ActivityIcon, WifiIcon, WifiOffIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as HealthResponse;
        if (active) {
          setHealth(data);
          setConnected(true);
        }
      } catch {
        if (active) {
          setHealth(null);
          setConnected(false);
        }
      }
    }

    void check();
    const interval = setInterval(check, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="size-5" />
              Hisse
            </CardTitle>
            <Badge variant={connected ? "default" : "destructive"}>
              {connected ? (
                <WifiIcon className="mr-1 size-3" />
              ) : (
                <WifiOffIcon className="mr-1 size-3" />
              )}
              {connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <CardDescription>Runtime health check via API driving adapter.</CardDescription>
        </CardHeader>
        <CardContent>
          {health ? (
            <pre className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              {JSON.stringify(health, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for API connection...</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
