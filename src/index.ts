import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_CONFIG } from "./config.js";
import { registerAllTools } from "./tools/registerTools.js";

// Cloudflare Worker types
interface Env {
  // Add any environment variables you need
  SECTORS_API_KEY?: string;
  SECTORS_API_BASE?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
  props: Record<string, any>; // This can hold any properties you want to pass through
}

// Define our MCP agent with all the sectors tools
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: SERVER_CONFIG.name,
    version: SERVER_CONFIG.version,
  });

  async init() {
    // Register all the existing sectors tools
    registerAllTools(this.server, this.props.myToken as string);
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Forbidden", { status: 403 });
    }

    console.log({ authHeader });

    const token = authHeader.split(/\s+/)[1] ?? "";

    ctx.props.myToken = token;

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
