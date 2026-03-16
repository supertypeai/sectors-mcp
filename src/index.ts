import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_CONFIG, OAUTH_CONFIG } from "./config.js";
import { registerAllTools } from "./tools/registerTools.js";
import { handleOAuthRoute, OAUTH_CORS_HEADERS } from "./auth/handlers.js";

// Extended environment with OAuth KV bindings
interface ExtendedEnv {
  SECTORS_API_KEY?: string;
  SECTORS_API_BASE?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SECTORS_OAUTH_CLIENT_ID: string;
  SECTORS_OAUTH_CLIENT_SECRET?: string;
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
  props: Record<string, any>;
}

// CORS headers for OAuth endpoints
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Create CORS preflight response
 */
function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Create 401 Unauthorized response with WWW-Authenticate header
 */
function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "unauthorized",
      error_description: "Valid Bearer token required",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer realm="Sectors MCP", resource_metadata="${OAUTH_CONFIG.issuer}.well-known/oauth-protected-resource"`,
      },
    }
  );
}

// Define our MCP agent with all the sectors tools
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: SERVER_CONFIG.name,
    version: SERVER_CONFIG.version,
  });

  async init() {
    // Register all the existing sectors tools
    registerAllTools(this.server, this.props.myToken as string, (this as any).env);
  }
}

export default {
  async fetch(
    request: Request,
    env: ExtendedEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    // 2. Handle HEAD requests (Claude requirement)
    if (request.method === "HEAD") {
      return new Response(null, { status: 200 });
    }

    // 3. Handle OAuth endpoints (unauthenticated)
    const oauthResponse = await handleOAuthRoute(request, env);
    if (oauthResponse) {
      return oauthResponse;
    }

    // 4. Handle MCP endpoints (authenticated)
    if (url.pathname === "/mcp" || url.pathname.startsWith("/sse")) {
      const authHeader = request.headers.get("authorization");

      if (!authHeader?.startsWith("Bearer ")) {
        return unauthorizedResponse();
      }

      const token = authHeader.split(/\s+/)[1] ?? "";
      ctx.props.myToken = token;

      if (url.pathname === "/sse" || url.pathname === "/sse/message") {
        return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
      }

      if (url.pathname === "/mcp") {
        return MyMCP.serve("/mcp").fetch(request, env, ctx);
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
