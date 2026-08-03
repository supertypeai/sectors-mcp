import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/server";
import { SERVER_CONFIG, OAUTH_CONFIG } from "./config.js";
import { registerAllTools } from "./tools/registerTools.js";
import { handleOAuthRoute, OAUTH_CORS_HEADERS } from "./auth/handlers.js";

// Extended environment with OAuth KV bindings.
// NOTE: The Durable Object binding (MCP_OBJECT) is intentionally gone — the
// MCP transport is now fully stateless (see the createMcpHandler wiring below),
// which eliminates the Durable Object SQLite `rows_written` that exhausted the
// free tier. OAuth still uses KV (OAUTH_KV), which is a separate quota.
interface ExtendedEnv {
  SECTORS_API_KEY?: string;
  SECTORS_API_BASE?: string;
  SECTORS_OAUTH_CLIENT_ID: string;
  SECTORS_OAUTH_CLIENT_SECRET?: string;
  OAUTH_KV: KVNamespace;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
  props: Record<string, any>;
}

// OpenAI MCP domain verification.
// The verification file must be served from the ORIGIN ROOT
// (https://sectors-mcp.supertype.ai/.well-known/...), NOT under /mcp.
// Both values below come from the OpenAI "verify domain" page:
//   - path:  the exact well-known filename it tells you to host
//   - token: the verification string, served as the plain-text body
// Replace the two placeholders, then redeploy. (No trailing newline.)
const OPENAI_DOMAIN_VERIFICATION = {
  path: "/.well-known/openai-apps-challenge",
  token: "_J7VC6LHi1NtFFktESmSG7pxd4x8AFj5gNI2H0Ze4Co",
};

// CORS headers for OAuth endpoints
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
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
      error_description: "Authentication required. Provide either an Authorization: Bearer <token> header or an X-API-Key: <key> header.",
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

// Hostnames the stateless MCP handler will accept in the `Host` header.
// createMcpHandler validates Host/Origin; a custom domain must be listed
// explicitly (localhost and *.workers.dev are covered by defaults).
const MCP_ALLOWED_HOSTNAMES = [
  "sectors-mcp.supertype.ai",
  "localhost",
  "127.0.0.1",
];

// Stateless, Durable-Object-free MCP handler.
//
// `createMcpHandler` with a per-request factory function delegates to the
// stateless handler in the Agents SDK: a fresh in-memory McpServer is built for
// each request and discarded when the request ends. Nothing is persisted, so
// there are ZERO Durable Object SQLite writes (the cause of the free-tier
// `rows_written` exhaustion under the old McpAgent transport).
//
// The caller's API key / bearer token is passed per-request via `authInfo.token`
// (see the fetch handler below) and threaded into the tools as the API key.
const mcpHandler = createMcpHandler(
  (ctx) => {
    const server = new McpServer({
      name: SERVER_CONFIG.name,
      version: SERVER_CONFIG.version,
    });
    const token = ctx.authInfo?.token;
    registerAllTools(server, token as string);
    return server;
  },
  {
    route: "/mcp",
    corsOptions: { origin: "*" },
    allowedHostnames: MCP_ALLOWED_HOSTNAMES,
  }
);

// JSON body returned for retired SSE endpoints.
function sseGoneResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "gone",
      error_description:
        "The SSE transport has been retired. Connect using the Streamable HTTP transport at /mcp instead.",
    }),
    {
      status: 410,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
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

    // 3. Serve the OpenAI domain-verification file at the origin root
    //    (unauthenticated, no redirect). Must come before the MCP/OAuth
    //    routing so it is reachable without a token.
    if (url.pathname === OPENAI_DOMAIN_VERIFICATION.path) {
      return new Response(OPENAI_DOMAIN_VERIFICATION.token, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 4. Handle OAuth endpoints (unauthenticated)
    const oauthResponse = await handleOAuthRoute(request, env);
    if (oauthResponse) {
      return oauthResponse;
    }

    // 5. Retire the legacy SSE transport. The persistent SSE connection kept a
    //    Durable Object alive and was the source of the DO `rows_written`
    //    exhaustion. Modern clients (Claude, ChatGPT, MCP Inspector) use the
    //    Streamable HTTP transport at /mcp instead.
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return sseGoneResponse();
    }

    // 6. Handle the MCP endpoint (authenticated, stateless Streamable HTTP)
    if (url.pathname === "/mcp") {
      const authHeader = request.headers.get("authorization");
      const apiKeyHeader = request.headers.get("x-api-key");

      let token: string | undefined;

      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(/\s+/)[1] ?? "";
      } else if (authHeader) {
        token = authHeader;
      } else if (apiKeyHeader) {
        token = apiKeyHeader;
      }

      if (!token) {
        return unauthorizedResponse();
      }

      // Pass the caller's credential to the per-request server factory via
      // authInfo.token; the handler is stateless and performs no persistence.
      return mcpHandler.fetch(request, {
        authInfo: { token, clientId: "sectors-mcp", scopes: ["read"] },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
