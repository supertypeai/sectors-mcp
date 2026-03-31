# OAuth Implementation Plan for Sectors MCP

**Target Domain:** `https://sectors-mcp.supertype.ai/`  
**Date:** March 2025  
**Goal:** Implement OAuth 2.0 authorization for Claude AI integration with full tool safety annotations

---

## Executive Summary

This document outlines the complete implementation plan for adding OAuth 2.0 authentication to the Sectors MCP server, enabling it to be registered as an official Claude AI connector. The implementation uses a **double-proxy OAuth architecture** where the Cloudflare Worker acts as an OAuth authorization server to Claude while proxying authentication to the upstream `api.sectors.app` OAuth provider.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLAUDE AI                                  │
│                    (MCP Client + OAuth Client)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ OAuth 2.0 + PKCE
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              YOUR CLOUDFLARE WORKER                              │
│            (MCP Server + OAuth Authorization Server)            │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  OAuth Router   │    │  MCP Server     │                     │
│  │                 │    │                 │                     │
│  │ • /.well-known  │    │ • /mcp          │                     │
│  │ • /register     │    │ • /sse          │                     │
│  │ • /authorize    │    └─────────────────┘                     │
│  │ • /callback     │                                           │
│  │ • /token        │                                           │
│  │ • /revoke       │                                           │
│  └─────────────────┘                                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ OAuth 2.0 (Client Credentials)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API.SECTORS.APP                               │
│         (Upstream OAuth Provider + Financial Data API)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Double-Proxy Architecture?

### Problem with Direct Proxy

The MCP SDK's `ProxyOAuthServerProvider` directly forwards OAuth parameters to the upstream server. This would require:
- Every MCP client (Claude, Cursor, MCP Inspector, etc.) to be registered directly on `api.sectors.app`
- Not scalable or secure

### Solution: Double-Proxy

Only your Worker is registered on `api.sectors.app`. All MCP clients:
1. Register dynamically with your Worker via RFC 7591
2. OAuth through your Worker
3. Your Worker maintains the relationship with `api.sectors.app`

**Benefits:**
- Single client registration on upstream
- Full control over authorization flow
- Can add custom logic (branding, consent pages, etc.)
- Isolates upstream from MCP client specifics

---

## Complete OAuth Flow

### 1. Discovery

```http
GET /.well-known/oauth-protected-resource
Response: 200
{
  "resource": "https://sectors-mcp.supertype.ai/",
  "authorization_servers": ["https://sectors-mcp.supertype.ai/"],
  "scopes_supported": ["read"],
  "resource_name": "Sectors MCP Server"
}

GET /.well-known/oauth-authorization-server
Response: 200
{
  "issuer": "https://sectors-mcp.supertype.ai/",
  "authorization_endpoint": "https://sectors-mcp.supertype.ai/authorize",
  "token_endpoint": "https://sectors-mcp.supertype.ai/token",
  "registration_endpoint": "https://sectors-mcp.supertype.ai/register",
  "revocation_endpoint": "https://sectors-mcp.supertype.ai/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["none"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["read"]
}
```

### 2. Dynamic Client Registration (RFC 7591)

```http
POST /register
Content-Type: application/json

{
  "redirect_uris": [
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback"
  ],
  "client_name": "Claude AI",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "read"
}

Response: 201 Created
{
  "client_id": "mcp-550e8400-e29b-41d4-a716-446655440000",
  "client_id_issued_at": 1704067200,
  "redirect_uris": [...],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "read"
}
```

### 3. Authorization (Double-Proxy Flow)

#### Step 1: Claude initiates authorization
```http
GET /authorize?
  client_id=mcp-550e8400-e29b-41d4-a716-446655440000&
  redirect_uri=https://claude.ai/api/mcp/auth_callback&
  response_type=code&
  scope=read&
  code_challenge=CLAUDE_CHALLENGE&
  code_challenge_method=S256&
  state=CLAUDE_STATE
```

**Worker actions:**
1. Parse and validate all parameters
2. Generate own PKCE pair:
   - `upstream_code_verifier` = random 43-char string
   - `upstream_code_challenge` = S256 hash of verifier
3. Store in KV:
   ```typescript
   interface AuthSession {
     clientId: "mcp-550e8400-...",
     redirectUri: "https://claude.ai/api/mcp/auth_callback",
     codeChallenge: "CLAUDE_CHALLENGE",
     state: "CLAUDE_STATE",
     upstreamCodeVerifier: "WORKER_VERIFIER",
     createdAt: 1704067200
   }
   ```
   Key: `session:${sessionId}`
   TTL: 10 minutes
4. Redirect user to Sectors:
   ```
   Location: https://api.sectors.app/oauth/authorize/?
     client_id=${SECTORS_OAUTH_CLIENT_ID}&
     redirect_uri=https://sectors-mcp.supertype.ai/callback&
     response_type=code&
     scope=read&
     code_challenge=${upstream_code_challenge}&
     code_challenge_method=S256&
     state=${sessionId}
   ```

#### Step 2: User logs in on Sectors
- User sees Sectors login page
- Authenticates with Sectors credentials
- Sectors redirects to Worker:
  ```
  GET /callback?code=SECTORS_CODE&state=SESSION_ID
  ```

#### Step 3: Worker exchanges code with Sectors
**Handler: `GET /callback`**
```typescript
async function handleCallback(request, env) {
  const url = new URL(request.url);
  const sectorsCode = url.searchParams.get('code');
  const sessionId = url.searchParams.get('state');
  
  // Retrieve stored session
  const session = await env.OAUTH_KV.get(`session:${sessionId}`, { type: 'json' });
  if (!session) return error(400, "Invalid or expired session");
  
  // Exchange code with Sectors
  const tokenResponse = await fetch('https://api.sectors.app/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.SECTORS_OAUTH_CLIENT_ID,
      client_secret: env.SECTORS_OAUTH_CLIENT_SECRET, // if applicable
      code: sectorsCode,
      redirect_uri: 'https://sectors-mcp.supertype.ai/callback',
      code_verifier: session.upstreamCodeVerifier
    })
  });
  
  if (!tokenResponse.ok) return error(500, "Token exchange failed");
  
  const sectorsTokens = await tokenResponse.json();
  
  // Generate local authorization code
  const localCode = crypto.randomUUID();
  
  // Store code mapping
  await env.OAUTH_KV.put(`code:${localCode}`, JSON.stringify({
    tokens: sectorsTokens,
    clientId: session.clientId,
    codeChallenge: session.codeChallenge,
    redirectUri: session.redirectUri,
    createdAt: Date.now()
  }), { expirationTtl: 600 }); // 10 min
  
  // Delete used session
  await env.OAUTH_KV.delete(`session:${sessionId}`);
  
  // Redirect back to Claude
  const redirectUrl = new URL(session.redirectUri);
  redirectUrl.searchParams.set('code', localCode);
  if (session.state) redirectUrl.searchParams.set('state', session.state);
  
  return Response.redirect(redirectUrl.href, 302);
}
```

### 4. Token Exchange

```http
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=${LOCAL_CODE}&
redirect_uri=https://claude.ai/api/mcp/auth_callback&
client_id=mcp-550e8400-e29b-41d4-a716-446655440000&
code_verifier=${CLAUDE_VERIFIER}
```

**Worker actions:**
1. Retrieve `code:${LOCAL_CODE}` from KV
2. Validate `client_id` matches stored value
3. Validate PKCE: S256(VERIFIER) == STORED_CHALLENGE
4. Return stored tokens:
   ```json
   {
     "access_token": "sectors_access_token",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "sectors_refresh_token",
     "scope": "read"
   }
   ```

### 5. MCP Usage with Bearer Token

```http
POST /mcp
Authorization: Bearer sectors_access_token
Content-Type: application/json

{ "jsonrpc": "2.0", "method": "tools/list", ... }
```

**Worker:**
1. Extract token from `Authorization: Bearer <token>`
2. Pass to tools via `ctx.props.myToken`
3. Tools use token to call `api.sectors.app/v1/...`

### 6. Token Refresh

```http
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=sectors_refresh_token&
client_id=mcp-550e8400-e29b-41d4-a716-446655440000
```

**Worker actions:**
1. Proxy to `api.sectors.app/oauth/token/`
2. Return new tokens from Sectors:
   ```json
   {
     "access_token": "new_access_token",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "new_refresh_token",
     "scope": "read"
   }
   ```

### 7. Token Revocation

```http
POST /revoke
Content-Type: application/x-www-form-urlencoded

token=sectors_access_token&
client_id=mcp-550e8400-e29b-41d4-a716-446655440000
```

**Worker actions:**
1. Proxy to `api.sectors.app/oauth/revoke_token/`
2. Return 200 OK

---

## File Implementation Plan

### New Files

#### 1. `src/auth/types.ts` (~40 lines)
TypeScript interfaces for OAuth data structures:
- `AuthSession` - Stored during authorization flow
- `CodeMapping` - Maps local codes to upstream tokens
- `RegisteredClient` - RFC 7591 client registration data
- `ExtendedEnv` - Environment with KV bindings

#### 2. `src/auth/pkce.ts` (~50 lines)
PKCE implementation using Web Crypto API:
```typescript
export function generateCodeVerifier(): string
export async function generateCodeChallenge(verifier: string): Promise<string>
export async function verifyCodeChallenge(verifier: string, challenge: string): Promise<boolean>
```

#### 3. `src/auth/clients.ts` (~60 lines)
Client registration store using KV:
```typescript
export async function registerClient(
  kv: KVNamespace, 
  metadata: OAuthClientMetadata
): Promise<OAuthClientInformationFull>

export async function getClient(
  kv: KVNamespace, 
  clientId: string
): Promise<OAuthClientInformationFull | null>

export function validateRedirectUri(
  client: OAuthClientInformationFull, 
  redirectUri: string
): boolean
```

#### 4. `src/auth/provider.ts` (~220 lines)
Core OAuth provider logic:
```typescript
export class SectorsOAuthProvider {
  constructor(env: ExtendedEnv)
  
  // Start authorization - returns redirect to Sectors
  async startAuthorization(params: AuthorizationRequest): Promise<string>
  
  // Handle callback from Sectors - exchanges code, stores tokens
  async handleCallback(sectorsCode: string, sessionId: string): Promise<CallbackResult>
  
  // Exchange local authorization code
  async exchangeAuthorizationCode(
    clientId: string, 
    code: string, 
    codeVerifier: string
  ): Promise<OAuthTokens>
  
  // Refresh tokens
  async refreshTokens(refreshToken: string): Promise<OAuthTokens>
  
  // Verify access token (call introspect or pass-through)
  async verifyAccessToken(token: string): Promise<AuthInfo>
  
  // Revoke token
  async revokeToken(token: string): Promise<void>
}
```

#### 5. `src/auth/handlers.ts` (~350 lines)
HTTP route handlers using native Request/Response:
```typescript
// Metadata endpoints
export function handleResourceMetadata(request: Request): Response
export function handleAuthServerMetadata(request: Request): Response

// OAuth flow
export async function handleRegister(request: Request, env: ExtendedEnv): Promise<Response>
export async function handleAuthorize(request: Request, env: ExtendedEnv): Promise<Response>
export async function handleCallback(request: Request, env: ExtendedEnv): Promise<Response>
export async function handleToken(request: Request, env: ExtendedEnv): Promise<Response>
export async function handleRevoke(request: Request, env: ExtendedEnv): Promise<Response>

// Main router
export async function handleOAuthRoute(request: Request, env: ExtendedEnv): Promise<Response | null>
```

### Modified Files

#### 1. `src/config.ts` (ADD ~15 lines)
Add OAuth configuration constants:
```typescript
export const SECTORS_OAUTH_BASE = "https://api.sectors.app";
export const OAUTH_ENDPOINTS = {
  authorize: "https://api.sectors.app/oauth/authorize/",
  token: "https://api.sectors.app/oauth/token/",
  revoke: "https://api.sectors.app/oauth/revoke_token/",
  introspect: "https://api.sectors.app/oauth/introspect/",
};

export const OAUTH_CONFIG = {
  issuer: "https://sectors-mcp.supertype.ai/",
  scopesSupported: ["read"],
  allowedRedirectUris: [
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback",
    "http://localhost:6274/oauth/callback",
    "http://localhost:6274/oauth/callback/debug"
  ]
};
```

#### 2. `src/utils/api.ts` (MODIFY ~3 lines)
Update header format to include Bearer prefix:
```typescript
// OLD:
return { Authorization: apiKey };

// NEW:
return { Authorization: `Bearer ${apiKey}` };
```

#### 3. `src/index.ts` (COMPLETE REWRITE ~100 lines)
New structure:
```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_CONFIG } from "./config.js";
import { registerAllTools } from "./tools/registerTools.js";
import { handleOAuthRoute, OAUTH_CONFIG } from "./auth/handlers.js";

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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function corsResponse(): Response {
  return new Response(null, { 
    status: 204, 
    headers: corsHeaders 
  });
}

export class MyMCP extends McpAgent {
  server = new McpServer({
    name: SERVER_CONFIG.name,
    version: SERVER_CONFIG.version,
  });

  async init() {
    registerAllTools(this.server, this.props.myToken as string, (this as any).env);
  }
}

export default {
  async fetch(request: Request, env: ExtendedEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // 1. CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }
    
    // 2. HEAD requests (Claude requirement)
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200 });
    }
    
    // 3. OAuth endpoints (unauthenticated)
    const oauthResponse = await handleOAuthRoute(request, env);
    if (oauthResponse) {
      return oauthResponse;
    }
    
    // 4. MCP endpoints (authenticated)
    if (url.pathname === "/mcp" || url.pathname.startsWith("/sse")) {
      const authHeader = request.headers.get("authorization");
      
      if (!authHeader?.startsWith("Bearer ")) {
        // Return 401 with WWW-Authenticate header per RFC 6750
        return new Response(
          JSON.stringify({
            error: "unauthorized",
            error_description: "Valid Bearer token required"
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 
                `Bearer realm="Sectors MCP", ` +
                `resource_metadata="${OAUTH_CONFIG.issuer}/.well-known/oauth-protected-resource"`,
            },
          }
        );
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
```

#### 4. `wrangler.jsonc` (ADD ~8 lines)
Add KV namespace binding:
```jsonc
{
  // ... existing config ...
  "kv_namespaces": [
    {
      "binding": "OAUTH_KV",
      "id": "<KV_NAMESPACE_ID>"  // To be created
    }
  ]
}
```

### Tool Files - Safety Annotations

All 41 tools need `readOnlyHint: true` added. Example for each pattern:

#### Pattern A: Tools calling `api.sectors.app` (e.g., `src/tools/subsectors.ts`)
```typescript
// OLD:
server.tool("get-subsectors", "Get list of subsectors", async () => {...});

// NEW:
server.tool(
  "get-subsectors", 
  "Get list of subsectors",
  {},  // empty params schema for tools without parameters
  async () => {...},
  { annotations: { readOnlyHint: true } }
);
```

#### Pattern B: Tools with parameters (e.g., `src/tools/companies.ts`)
```typescript
// OLD:
server.tool(
  "fetch-company-report",
  "Fetch detailed company report",
  { ticker: z.string(), sections: z.array(z.string()).optional() },
  async ({ ticker, sections }) => {...}
);

// NEW:
server.tool(
  "fetch-company-report",
  "Fetch detailed company report",
  { ticker: z.string(), sections: z.array(z.string()).optional() },
  async ({ ticker, sections }) => {...},
  { annotations: { readOnlyHint: true } }
);
```

#### Pattern C: Supabase tools (e.g., `src/tools/getIpoCompanies.ts`)
```typescript
// OLD:
server.tool(
  "fetch-ipo-companies",
  "Fetch recently listed IPO companies...",
  { startDate: z.string().optional(), ... },
  async ({ startDate, ... }) => {...}
);

// NEW:
server.tool(
  "fetch-ipo-companies",
  "Fetch recently listed IPO companies...",
  { startDate: z.string().optional(), ... },
  async ({ startDate, ... }) => {...},
  { annotations: { readOnlyHint: true } }
);
```

**Complete list of files needing annotation updates:**
1. `src/tools/subsectors.ts` - 1 tool
2. `src/tools/industries.ts` - 1 tool
3. `src/tools/subindustries.ts` - 1 tool
4. `src/tools/indexData.ts` - 1 tool
5. `src/tools/companies.ts` - 9 tools
6. `src/tools/companiesByIndex.ts` - 1 tool
7. `src/tools/companyReport.ts` - 1 tool
8. `src/tools/sgxSectors.ts` - 1 tool
9. `src/tools/sgxCompanyReport.ts` - 1 tool
10. `src/tools/sgxTopCompanies.ts` - 1 tool
11. `src/tools/indexDaily.ts` - 1 tool
12. `src/tools/topMovers.ts` - 1 tool
13. `src/tools/mostTraded.ts` - 1 tool
14. `src/tools/topGrowth.ts` - 1 tool
15. `src/tools/topCompanies.ts` - 1 tool
16. `src/tools/idxMarketCap.ts` - 1 tool
17. `src/tools/dailyTransaction.ts` - 1 tool
18. `src/tools/freeFloat.ts` - 1 tool
19. `src/tools/getIpoCompanies.ts` - 1 tool
20. `src/tools/historicalFinancial.ts` - 1 tool
21. `src/tools/getCompaniesReport.ts` - 1 tool
22. `src/tools/getDailyTransaction.ts` - 1 tool
23. `src/tools/getCompanyDividend.ts` - 1 tool
24. `src/tools/getCompanyFinancial.ts` - 1 tool
25. `src/tools/subsectorReport.ts` - 1 tool
26. `src/tools/topCompaniesByMetrics.ts` - 1 tool
27. `src/tools/getCompaniesNipe.ts` - 1 tool
28. `src/tools/getSingaporeCompanyHistoricalFinancial.ts` - 1 tool
29. `src/tools/getSingaporeCompaniesReport.ts` - 1 tool
30. `src/tools/getSingaporeDailyTransaction.ts` - 1 tool
31. `src/tools/getSingaporeCompanyDividend.ts` - 1 tool
32. `src/tools/getSingaporeTopCompaniesByMetrics.ts` - 1 tool
33. `src/tools/getSingaporeAdvancedMetrics.ts` - 2 tools

**Total: 41 tools** - all marked as `readOnlyHint: true`

---

## Pre-Deployment Checklist

### 1. Sectors.app Setup

**Register OAuth Application on api.sectors.app:**
```
Application Name: Sectors MCP Server
Redirect URI: https://sectors-mcp.supertype.ai/callback
Grant Types: authorization_code, refresh_token
Scopes: read
```

**Note down:**
- `client_id` (provided by Sectors)
- `client_secret` (if applicable)

### 2. Cloudflare Setup

**Create KV Namespace:**
```bash
wrangler kv namespace create OAUTH_KV
```

**Add to wrangler.jsonc:**
```json
"kv_namespaces": [
  {
    "binding": "OAUTH_KV",
    "id": "<ID_FROM_ABOVE>"
  }
]
```

**Set Secrets:**
```bash
wrangler secret put SECTORS_OAUTH_CLIENT_ID
# Enter: <client_id from Sectors>

wrangler secret put SECTORS_OAUTH_CLIENT_SECRET
# Enter: <client_secret from Sectors> (if applicable)
```

### 3. DNS Configuration

Ensure `sectors-mcp.supertype.ai` points to your Cloudflare Worker.

### 4. Testing Checklist

#### OAuth Discovery
- [ ] `GET https://sectors-mcp.supertype.ai/.well-known/oauth-protected-resource` returns 200
- [ ] `GET https://sectors-mcp.supertype.ai/.well-known/oauth-authorization-server` returns 200

#### Client Registration
- [ ] `POST /register` with Claude's metadata returns 201 with client_id
- [ ] `POST /register` rejects invalid redirect URIs

#### Authorization Flow
- [ ] `GET /authorize` without auth returns 401
- [ ] `GET /authorize` with valid params redirects to Sectors
- [ ] User can log in on Sectors
- [ ] Callback exchanges code and redirects to Claude
- [ ] Invalid session ID returns error

#### Token Exchange
- [ ] `POST /token` with valid code returns tokens
- [ ] `POST /token` with invalid code returns 400
- [ ] `POST /token` with wrong PKCE verifier returns 400

#### MCP Access
- [ ] `GET /mcp` without token returns 401 with WWW-Authenticate
- [ ] `GET /mcp` with valid Bearer token returns tools list
- [ ] All tools have `readOnlyHint: true` in metadata

#### Token Refresh
- [ ] `POST /token` with `grant_type=refresh_token` returns new tokens
- [ ] Expired refresh token returns 400

#### Token Revocation
- [ ] `POST /revoke` with valid token returns 200
- [ ] Revoked token no longer works for MCP access

#### CORS
- [ ] All OAuth endpoints return proper CORS headers
- [ ] OPTIONS requests return 204

#### HEAD Requests
- [ ] `HEAD /mcp` returns 200 (Claude requirement)

---

## Error Handling

### Standard OAuth Error Responses

All errors follow RFC 6749 format:

```json
{
  "error": "invalid_request | invalid_client | invalid_grant | ...",
  "error_description": "Human-readable description",
  "error_uri": "https://docs.example.com/oauth/errors#invalid_request"
}
```

### Specific Error Scenarios

| Scenario | Endpoint | Status | Error Code |
|----------|----------|--------|------------|
| Missing client_id | /authorize | 400 | invalid_request |
| Invalid client_id | /authorize | 400 | invalid_client |
| Unregistered redirect_uri | /authorize | 400 | invalid_request |
| Invalid PKCE challenge | /authorize | 400 | invalid_request |
| Expired session | /callback | 400 | invalid_grant |
| Invalid code | /token | 400 | invalid_grant |
| Invalid PKCE verifier | /token | 400 | invalid_grant |
| Invalid refresh_token | /token | 400 | invalid_grant |
| Missing token | /mcp | 401 | (WWW-Authenticate) |
| Invalid token | /mcp | 401 | invalid_token |

---

## Claude Directory Submission Requirements

This implementation satisfies all mandatory requirements:

### ✅ OAuth 2.0 Implementation
- Authorization code flow with PKCE
- Dynamic client registration (RFC 7591)
- Token refresh
- Token revocation
- Proper error responses

### ✅ Claude Callback URL Allowlist
```typescript
const allowedRedirectUris = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "http://localhost:6274/oauth/callback",
  "http://localhost:6274/oauth/callback/debug"
];
```

### ✅ Tool Safety Annotations
All 41 tools have `readOnlyHint: true`

### ✅ Transport
Streamable HTTP transport (already implemented)

### ✅ Production Ready
- HTTPS with valid certificate
- CORS configured
- Rate limiting (to be added)
- Comprehensive error handling

---

## Optional Enhancements (Post-Launch)

1. **Rate Limiting**: Add per-IP and per-client rate limits on OAuth endpoints
2. **Token Introspection Caching**: Cache introspect results for 60 seconds
3. **Custom Consent Page**: Show branded approval page before redirecting to Sectors
4. **Analytics**: Log OAuth events for monitoring
5. **Multiple Scopes**: Add `write` scope if needed later
6. **Session Management**: Allow users to revoke specific sessions
7. **Health Check**: Add `/health` endpoint for monitoring

---

## Summary Statistics

- **New Files**: 5 (types, pkce, clients, provider, handlers)
- **Modified Files**: 4 (config, utils/api, index, wrangler)
- **Tool Files Updated**: 33 (adding annotations)
- **Total Lines of Code**: ~850 new, ~200 modified
- **OAuth Endpoints**: 7 (metadata x2, register, authorize, callback, token, revoke)
- **Tools with Annotations**: 41
- **Estimated Implementation Time**: 4-6 hours

---

## Next Steps

1. Review and approve this plan
2. Set up OAuth application on api.sectors.app
3. Create KV namespace and set secrets
4. Implement files in order:
   1. `src/auth/types.ts`
   2. `src/auth/pkce.ts`
   3. `src/auth/clients.ts`
   4. `src/auth/provider.ts`
   5. `src/auth/handlers.ts`
   6. `src/config.ts` (update)
   7. `src/utils/api.ts` (update)
   8. `src/index.ts` (rewrite)
   9. `wrangler.jsonc` (update)
   10. All tool files (annotations)
5. Deploy and test
6. Submit to Claude MCP Directory
