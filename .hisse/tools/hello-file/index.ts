import { Type } from "@sinclair/typebox";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function helloFileExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "hello-file",
    label: "Hello File",
    description: "Creates a file with 'bonjour' written in it.",
    parameters: Type.Object({
      path: Type.String({ description: "The file path to create" }),
    }),
    async execute(_toolCallId, params) {
      const { writeFile } = await import("node:fs/promises");
      const filePath = (params as { path: string }).path;
      await writeFile(filePath, "bonjour\n", "utf-8");
      return {
        content: [{ type: "text", text: `Created file at ${filePath} with content "bonjour"` }],
      };
    },
  });
}
