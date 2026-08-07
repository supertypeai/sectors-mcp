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

// Hard-retirement switch for the legacy /sse transport.
//
// While false, /sse is transparently bridged to the stateless /mcp handler so
// existing clients keep working (see the fetch handler). Flip to true once
// traffic confirms no client depends on /sse. In that mode /sse is rejected in
// a way that does NOT provoke the OAuth discovery retry loop (see below).
const HARD_RETIRE_SSE = false;

// Terminal response for the hard-retired /sse endpoint.
//
// Design notes, to avoid re-triggering the client discovery/retry loop:
//  - Use 404 Not Found, not 401/410. A 401 carries a WWW-Authenticate challenge
//    that makes MCP clients re-run OAuth discovery; 410 was observed to make
//    clients re-discover and retry. 404 reads as "this endpoint does not exist"
//    and lets a client give up.
//  - Send no auth challenge header and no JSON error body that a client might
//    interpret as a recoverable protocol error. A short text/plain body is
//    inert.
function sseRetiredResponse(): Response {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders,
    },
  });
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

    // 5. Legacy /sse path. The old Server-Sent Events transport is retired.
    //
    //    Observed clients on /sse are not opening classic held-open EventSource
    //    streams. They POST self-contained JSON-RPC with an
    //    `Accept: application/json, text/event-stream` header, which is the
    //    Streamable HTTP shape. So instead of returning 410 (which made those
    //    clients loop and re-run OAuth discovery), we transparently serve /sse
    //    through the same stateless handler as /mcp by rewriting the path.
    //
    //    Flip HARD_RETIRE_SSE to true once traffic confirms no client depends on
    //    /sse. In that mode /sse gets a terminal 404 with no auth challenge and
    //    no JSON error body, so clients stop rather than re-triggering discovery.
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      if (HARD_RETIRE_SSE) {
        return sseRetiredResponse();
      }
      // Bridge to the stateless handler: rewrite the path to /mcp so the
      // handler's route check passes, then serve it exactly like /mcp.
      const mcpUrl = new URL(request.url);
      mcpUrl.pathname = "/mcp";
      const bridged = new Request(mcpUrl.toString(), request);
      return handleMcpRequest(bridged);
    }

    // 6. Handle the MCP endpoint (authenticated, stateless Streamable HTTP)
    if (url.pathname === "/mcp") {
      return handleMcpRequest(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

/**
 * Extract the caller's credential and serve the request through the stateless
 * MCP handler. Shared by the /mcp route and the /sse compatibility bridge.
 */
async function handleMcpRequest(request: Request): Promise<Response> {
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
