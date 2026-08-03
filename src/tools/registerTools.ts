import { McpServer } from "@modelcontextprotocol/server";
import { SECTORS_API_BASE } from "../config.js";

// Import auto-generated REST tools (64 tools from schema.json)
import * as GeneratedTools from "./generated/index.js";

export function registerAllTools(server: McpServer, apiKey: string, _env?: any) {
  // All tools are auto-generated from schema.json → src/tools/generated/
  // They proxy api.sectors.app/v2 REST endpoints
  Object.entries(GeneratedTools).forEach(([name, fn]) => {
    if (name.startsWith("register") && name.endsWith("Tool") && typeof fn === "function") {
      (fn as any)(server, SECTORS_API_BASE, apiKey);
    }
  });
}
