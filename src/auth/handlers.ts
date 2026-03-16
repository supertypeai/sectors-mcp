/**
 * OAuth HTTP Route Handlers
 * 
 * Implements OAuth 2.0 HTTP endpoints using native Web API Request/Response.
 * This avoids Express dependencies which are incompatible with Cloudflare Workers.
 * 
 * Endpoints:
 * - /.well-known/oauth-protected-resource (RFC 8414)
 * - /.well-known/oauth-authorization-server (RFC 8414)
 * - /register (RFC 7591)
 * - /authorize (OAuth 2.0)
 * - /callback (Double-proxy callback)
 * - /token (OAuth 2.0)
 * - /revoke (OAuth 2.0 Token Revocation)
 */

import { SectorsOAuthProvider } from "./provider.js";
import { registerClient, getClient } from "./clients.js";
import {
  ExtendedEnv,
  OAuthClientMetadata,
  OAuthProtectedResourceMetadata,
  OAuthAuthorizationServerMetadata,
} from "./types.js";

// Domain configuration
const ISSUER = "https://sectors-mcp.supertype.ai/";

// Claude allowlisted redirect URIs
const ALLOWED_REDIRECT_URIS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "http://localhost:6274/oauth/callback",
  "http://localhost:6274/oauth/callback/debug",
];

// CORS headers for OAuth endpoints
export const OAUTH_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Create a JSON response with proper headers
 */
function jsonResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...OAUTH_CORS_HEADERS,
    },
  });
}

/**
 * Create an OAuth error response (RFC 6749)
 */
function oauthError(
  error: string,
  description?: string,
  status = 400
): Response {
  const body: Record<string, string> = { error };
  if (description) body.error_description = description;
  return jsonResponse(body, status);
}

/**
 * Handle OAuth Protected Resource Metadata (RFC 8414)
 * GET /.well-known/oauth-protected-resource
 */
export function handleResourceMetadata(): Response {
  const metadata: OAuthProtectedResourceMetadata = {
    resource: ISSUER,
    authorization_servers: [ISSUER],
    scopes_supported: ["read"],
    resource_name: "Sectors MCP Server",
  };
  return jsonResponse(metadata);
}

/**
 * Handle OAuth Authorization Server Metadata (RFC 8414)
 * GET /.well-known/oauth-authorization-server
 */
export function handleAuthServerMetadata(): Response {
  const metadata: OAuthAuthorizationServerMetadata = {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}authorize`,
    token_endpoint: `${ISSUER}token`,
    registration_endpoint: `${ISSUER}register`,
    revocation_endpoint: `${ISSUER}revoke`,
    introspection_endpoint: `${ISSUER}introspect`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["read"],
  };
  return jsonResponse(metadata);
}

/**
 * Handle Dynamic Client Registration (RFC 7591)
 * POST /register
 */
export async function handleRegister(
  request: Request,
  env: ExtendedEnv
): Promise<Response> {
  try {
    const body = (await request.json()) as Partial<OAuthClientMetadata>;

    // Validate required fields
    if (!body.redirect_uris || !Array.isArray(body.redirect_uris)) {
      return oauthError("invalid_request", "redirect_uris is required");
    }

    // Validate redirect URIs against allowlist
    for (const uri of body.redirect_uris) {
      if (!ALLOWED_REDIRECT_URIS.includes(uri)) {
        return oauthError(
          "invalid_request",
          `redirect_uri not allowed: ${uri}`
        );
      }
    }

    // Set defaults for optional fields
    const metadata: OAuthClientMetadata = {
      redirect_uris: body.redirect_uris,
      client_name: body.client_name,
      client_uri: body.client_uri,
      logo_uri: body.logo_uri,
      grant_types: body.grant_types || ["authorization_code", "refresh_token"],
      response_types: body.response_types || ["code"],
      token_endpoint_auth_method: body.token_endpoint_auth_method || "none",
      scope: body.scope || "read",
    };

    // Validate grant_types
    const validGrants = ["authorization_code", "refresh_token"];
    for (const grant of metadata.grant_types) {
      if (!validGrants.includes(grant)) {
        return oauthError("invalid_request", `Unsupported grant_type: ${grant}`);
      }
    }

    // Register client
    const client = await registerClient(env.OAUTH_KV, metadata);

    return jsonResponse(client, 201);
  } catch (error) {
    console.error("Registration error:", error);
    return oauthError(
      "server_error",
      error instanceof Error ? error.message : "Registration failed"
    );
  }
}

/**
 * Handle Authorization Request (OAuth 2.0)
 * GET /authorize
 */
export async function handleAuthorize(
  request: Request,
  env: ExtendedEnv
): Promise<Response> {
  const url = new URL(request.url);

  // Extract parameters
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const responseType = url.searchParams.get("response_type");
  const scope = url.searchParams.get("scope") || "read";
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const state = url.searchParams.get("state");

  // Validate required parameters
  if (!clientId) {
    return oauthError("invalid_request", "client_id is required");
  }
  if (!redirectUri) {
    return oauthError("invalid_request", "redirect_uri is required");
  }
  if (!responseType) {
    return oauthError("invalid_request", "response_type is required");
  }
  if (!codeChallenge) {
    return oauthError("invalid_request", "code_challenge is required");
  }
  if (codeChallengeMethod !== "S256") {
    return oauthError(
      "invalid_request",
      "code_challenge_method must be S256"
    );
  }

  const baseUrl = `${url.protocol}//${url.host}`;
  const provider = new SectorsOAuthProvider(env, baseUrl);

  try {
    // Start authorization - this validates client, generates session,
    // and returns redirect URL to Sectors OAuth provider
    const redirectUrl = await provider.startAuthorization({
      clientId,
      redirectUri,
      responseType,
      scope,
      codeChallenge,
      codeChallengeMethod,
      state,
    });

    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("invalid_client")) {
      return oauthError("invalid_client", "Client not found");
    }
    if (message.includes("invalid_request")) {
      return oauthError("invalid_request", message.replace("invalid_request: ", ""));
    }
    return oauthError("server_error", message);
  }
}

/**
 * Handle Callback from Sectors OAuth Provider
 * GET /callback
 */
export async function handleCallback(
  request: Request,
  env: ExtendedEnv
): Promise<Response> {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle error from upstream
  if (error) {
    return oauthError(
      error,
      errorDescription || "Authorization failed"
    );
  }

  if (!code) {
    return oauthError("invalid_request", "Missing authorization code");
  }

  if (!state) {
    return oauthError("invalid_request", "Missing state parameter");
  }

  const baseUrl = `${url.protocol}//${url.host}`;
  const provider = new SectorsOAuthProvider(env, baseUrl);

  try {
    const result = await provider.handleCallback(code, state);

    if (!result.success || !result.redirectUrl) {
      return oauthError(
        result.error || "server_error",
        result.errorDescription
      );
    }

    return Response.redirect(result.redirectUrl, 302);
  } catch (error) {
    return oauthError(
      "server_error",
      error instanceof Error ? error.message : "Callback handling failed"
    );
  }
}

/**
 * Handle Token Request (OAuth 2.0)
 * POST /token
 */
export async function handleToken(
  request: Request,
  env: ExtendedEnv
): Promise<Response> {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return oauthError(
      "invalid_request",
      "Content-Type must be application/x-www-form-urlencoded"
    );
  }

  const body = await request.text();
  const params = new URLSearchParams(body);

  const grantType = params.get("grant_type");
  const clientId = params.get("client_id");

  if (!clientId) {
    return oauthError("invalid_request", "client_id is required");
  }

  const provider = new SectorsOAuthProvider(env);

  try {
    if (grantType === "authorization_code") {
      const code = params.get("code");
      const redirectUri = params.get("redirect_uri");
      const codeVerifier = params.get("code_verifier");

      if (!code) {
        return oauthError("invalid_request", "code is required");
      }
      if (!redirectUri) {
        return oauthError("invalid_request", "redirect_uri is required");
      }
      if (!codeVerifier) {
        return oauthError("invalid_request", "code_verifier is required");
      }

      const tokens = await provider.exchangeAuthorizationCode(
        clientId,
        code,
        codeVerifier
      );

      return jsonResponse(tokens);
    } else if (grantType === "refresh_token") {
      const refreshToken = params.get("refresh_token");

      if (!refreshToken) {
        return oauthError("invalid_request", "refresh_token is required");
      }

      const tokens = await provider.refreshTokens(refreshToken);
      return jsonResponse(tokens);
    } else {
      return oauthError("unsupported_grant_type", `Grant type ${grantType} is not supported`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed";
    if (message.includes("invalid_grant")) {
      return oauthError("invalid_grant", message.replace("invalid_grant: ", ""));
    }
    return oauthError("server_error", message);
  }
}

/**
 * Handle Token Revocation (OAuth 2.0 Token Revocation)
 * POST /revoke
 */
export async function handleRevoke(
  request: Request,
  env: ExtendedEnv
): Promise<Response> {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return oauthError(
      "invalid_request",
      "Content-Type must be application/x-www-form-urlencoded"
    );
  }

  const body = await request.text();
  const params = new URLSearchParams(body);

  const token = params.get("token");

  if (!token) {
    return oauthError("invalid_request", "token is required");
  }

  const provider = new SectorsOAuthProvider(env);

  try {
    await provider.revokeToken(token);
    return new Response(null, { status: 200, headers: OAUTH_CORS_HEADERS });
  } catch (error) {
    console.error("Token revocation error:", error);
    // Per RFC 7009, return 200 even on error to prevent information leakage
    return new Response(null, { status: 200, headers: OAUTH_CORS_HEADERS });
  }
}

/**
 * Main OAuth Router
 * Routes requests to appropriate handlers based on path
 * 
 * @param request - The incoming request
 * @param env - Extended environment with KV bindings
 * @returns Response if path matches OAuth routes, null otherwise
 */
export async function handleOAuthRoute(
  request: Request,
  env: ExtendedEnv
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: OAUTH_CORS_HEADERS,
    });
  }

  // Discovery endpoints
  if (path === "/.well-known/oauth-protected-resource" && method === "GET") {
    return handleResourceMetadata();
  }

  if (path === "/.well-known/oauth-authorization-server" && method === "GET") {
    return handleAuthServerMetadata();
  }

  // OAuth endpoints
  if (path === "/register" && method === "POST") {
    return handleRegister(request, env);
  }

  if (path === "/authorize" && method === "GET") {
    return handleAuthorize(request, env);
  }

  if (path === "/callback" && method === "GET") {
    return handleCallback(request, env);
  }

  if (path === "/token" && method === "POST") {
    return handleToken(request, env);
  }

  if (path === "/revoke" && method === "POST") {
    return handleRevoke(request, env);
  }

  // No OAuth route matched
  return null;
}

export default handleOAuthRoute;
