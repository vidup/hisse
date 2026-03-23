export type ConnectorMethod = "api_key" | "oauth";
export type ConnectorStatus = "connected" | "expired" | "error";

export interface ApiKeyConnector {
  provider: string;
  method: "api_key";
  apiKey: string;
  status: "connected" | "error";
  connectedAt: string;
  updatedAt: string;
}

export interface OAuthConnector {
  provider: string;
  method: "oauth";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  status: "connected" | "expired" | "error";
  connectedAt: string;
  updatedAt: string;
}

export type Connector = ApiKeyConnector | OAuthConnector;

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function maskConnector(connector: Connector): Connector {
  if (connector.method === "api_key") {
    return { ...connector, apiKey: maskApiKey(connector.apiKey) };
  }
  return { ...connector, accessToken: maskApiKey(connector.accessToken) };
}
