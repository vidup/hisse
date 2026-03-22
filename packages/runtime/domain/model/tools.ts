export type ToolId = string;

export class Tool {
  constructor(
    public readonly name: string,
    public readonly codePath: string,
  ) {}
}
