export interface HealthPort {
  check(): Promise<{ status: string }>;
}
