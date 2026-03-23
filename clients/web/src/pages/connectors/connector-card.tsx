import { TrashIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConnectorSummary } from "@/lib/api";
import { useRemoveConnector } from "@/hooks/use-connectors";

interface ConnectorCardProps {
  connector: ConnectorSummary;
}

export function ConnectorCard({ connector }: ConnectorCardProps) {
  const { mutate: remove, isPending } = useRemoveConnector();

  const maskedKey = connector.method === "api_key" ? connector.apiKey : connector.accessToken;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{connector.provider}</CardTitle>
          <Badge variant={connector.status === "connected" ? "default" : "destructive"}>
            {connector.status}
          </Badge>
        </div>
        <CardDescription>
          {connector.method === "api_key" ? "API Key" : "OAuth"} — {maskedKey}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Connected {new Date(connector.connectedAt).toLocaleDateString()}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => remove(connector.provider)}
          disabled={isPending}
        >
          <TrashIcon />
        </Button>
      </CardContent>
    </Card>
  );
}
