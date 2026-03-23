import { useState } from "react";
import { PlusIcon, PlugIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { PageLayout } from "@/layouts/page-layout";
import { useConnectors } from "@/hooks/use-connectors";
import { ConnectorCard } from "./connector-card";
import { AddConnectorDialog } from "./add-connector-dialog";

export function ConnectorsPage() {
  const { data: connectors, isLoading } = useConnectors();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <PageLayout
      title="Connectors"
      action={
        <Button onClick={() => setDialogOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Add Connector
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : connectors && connectors.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connectors.map((connector) => (
            <ConnectorCard key={connector.provider} connector={connector} />
          ))}
        </div>
      ) : (
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlugIcon />
            </EmptyMedia>
            <EmptyTitle>No connectors configured</EmptyTitle>
            <EmptyDescription>
              Add an API key or OAuth token to connect to an AI provider.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <AddConnectorDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageLayout>
  );
}
