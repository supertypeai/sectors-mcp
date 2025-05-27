import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_CONFIG } from "./config.js";
import { registerAllTools } from "./tools/registerTools.js";

// Initialize MCP server
const server = new McpServer({
  name: SERVER_CONFIG.name,
  version: SERVER_CONFIG.version,
});

// Register all tools
registerAllTools(server);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Sectors MCP server started");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
