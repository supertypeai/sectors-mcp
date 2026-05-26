/**
 * Core OAuth Provider Implementation
 * 
 * Implements the double-proxy OAuth architecture where the Worker acts as
 * an OAuth Authorization Server to MCP clients while being an OAuth Client
 * to the upstream api.sectors.app provider.
 */

import {
  ExtendedEnv,
  AuthSession,
  CodeMapping,
  OAuthTokens,
  AuthInfo,
  CallbackResult,
  AuthorizationRequest,
} from "./types.js";
import { getClient, validateRedirectUri } from "./clients.js";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  verifyCodeChallenge,
} from "./pkce.js";

const SESSION_PREFIX = "session:";
const CODE_PREFIX = "code:";
const SESSION_TTL = 600; // 10 minutes
const CODE_TTL = 600; // 10 minutes

/**
 * Sectors OAuth Provider - Double-Proxy Implementation
 * 
 * Handles OAuth 2.0 authorization code flow with PKCE, proxying
 * authentication to api.sectors.app while managing client registrations
 * and sessions locally.
 */
export class SectorsOAuthProvider {
  private env: ExtendedEnv;
  private baseUrl: string;

  constructor(env: ExtendedEnv, baseUrl?: string) {
    this.env = env;
    this.baseUrl = (baseUrl || "https://sectors-mcp.supertype.ai").replace(/\/$/, ""); // Remove trailing slash
  }

  /**
   * Start the authorization flow
   * Validates the client, generates PKCE parameters, stores session,
   * and returns the redirect URL to the upstream Sectors OAuth provider.
   * 
   * @param request - Authorization request parameters
   * @returns Redirect URL to Sectors OAuth provider
   * @throws Error if client is invalid or redirect URI is not allowed
   */
  async startAuthorization(request: AuthorizationRequest): Promise<string> {
    // Validate client exists
    const client = await getClient(this.env.OAUTH_KV, request.clientId);
    if (!client) {
      throw new Error("invalid_client");
    }

    // Validate redirect URI
    if (!validateRedirectUri(client, request.redirectUri)) {
      throw new Error("invalid_request: redirect_uri not registered");
    }

    // Validate response type
    if (request.responseType !== "code") {
      throw new Error("unsupported_response_type");
    }

    // Generate session ID and upstream PKCE parameters
    const sessionId = crypto.randomUUID();
    const upstreamCodeVerifier = generateCodeVerifier();
    const upstreamCodeChallenge = await generateCodeChallenge(upstreamCodeVerifier);

    // Store session in KV
    const session: AuthSession = {
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
      state: request.state ?? null,
      upstreamCodeVerifier,
      createdAt: Date.now(),
    };

    await this.env.OAUTH_KV.put(
      `${SESSION_PREFIX}${sessionId}`,
      JSON.stringify(session),
      { expirationTtl: SESSION_TTL }
    );

    // Build redirect URL to Sectors OAuth provider
    const sectorsAuthorizeUrl = new URL(
      "https://api.sectors.app/oauth/authorize/"
    );
    sectorsAuthorizeUrl.searchParams.set("client_id", this.env.SECTORS_OAUTH_CLIENT_ID);
    sectorsAuthorizeUrl.searchParams.set(
      "redirect_uri",
      `${this.baseUrl}/callback`
    );
    sectorsAuthorizeUrl.searchParams.set("response_type", "code");
    sectorsAuthorizeUrl.searchParams.set("scope", request.scope || "read");
    sectorsAuthorizeUrl.searchParams.set("code_challenge", upstreamCodeChallenge);
    sectorsAuthorizeUrl.searchParams.set("code_challenge_method", "S256");
    sectorsAuthorizeUrl.searchParams.set("state", sessionId);

    return sectorsAuthorizeUrl.toString();
  }

  /**
   * Handle the callback from the upstream Sectors OAuth provider
   * Exchanges the upstream code for tokens, generates a local authorization
   * code, and returns the redirect URL back to the MCP client.
   * 
   * @param sectorsCode - Authorization code from Sectors
   * @param sessionId - Session ID from state parameter
   * @returns Callback result with redirect URL or error
   */
  async handleCallback(
    sectorsCode: string,
    sessionId: string
  ): Promise<CallbackResult> {
    // Retrieve stored session
    const sessionData = await this.env.OAUTH_KV.get(
      `${SESSION_PREFIX}${sessionId}`,
      { type: "json" }
    );

    if (!sessionData) {
      return {
        success: false,
        error: "invalid_grant",
        errorDescription: "Invalid or expired session",
      };
    }

    const session = sessionData as AuthSession;

    try {
      // Exchange code with Sectors
      const tokenResponse = await fetch(
        "https://api.sectors.app/oauth/token/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: this.env.SECTORS_OAUTH_CLIENT_ID,
            ...(this.env.SECTORS_OAUTH_CLIENT_SECRET && {
              client_secret: this.env.SECTORS_OAUTH_CLIENT_SECRET,
            }),
            code: sectorsCode,
            redirect_uri: `${this.baseUrl}/callback`,
            code_verifier: session.upstreamCodeVerifier,
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorData = (await tokenResponse
          .json()
          .catch(() => ({}))) as { error_description?: string };
        return {
          success: false,
          error: "server_error",
          errorDescription:
            errorData.error_description || "Token exchange failed",
        };
      }

      const sectorsTokens: OAuthTokens = await tokenResponse.json();

      // Generate local authorization code
      const localCode = crypto.randomUUID();

      // Store code-to-token mapping
      const codeMapping: CodeMapping = {
        tokens: sectorsTokens,
        clientId: session.clientId,
        codeChallenge: session.codeChallenge,
        redirectUri: session.redirectUri,
        createdAt: Date.now(),
      };

      await this.env.OAUTH_KV.put(
        `${CODE_PREFIX}${localCode}`,
        JSON.stringify(codeMapping),
        { expirationTtl: CODE_TTL }
      );

      // Delete used session
      await this.env.OAUTH_KV.delete(`${SESSION_PREFIX}${sessionId}`);

      // Build redirect URL back to client
      const redirectUrl = new URL(session.redirectUri);
      redirectUrl.searchParams.set("code", localCode);
      if (session.state) {
        redirectUrl.searchParams.set("state", session.state);
      }

      return {
        success: true,
        redirectUrl: redirectUrl.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: "server_error",
        errorDescription:
          error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Exchange a local authorization code for tokens
   * Validates the code, PKCE verifier, and returns the stored tokens.
   * 
   * @param clientId - The client ID
   * @param code - The authorization code
   * @param codeVerifier - The PKCE code verifier
   * @returns OAuth tokens
   * @throws Error if code is invalid or PKCE verification fails
   */
  async exchangeAuthorizationCode(
    clientId: string,
    code: string,
    codeVerifier: string
  ): Promise<OAuthTokens> {
    // Retrieve code mapping
    const codeData = await this.env.OAUTH_KV.get(`${CODE_PREFIX}${code}`, {
      type: "json",
    });

    if (!codeData) {
      throw new Error("invalid_grant: Invalid or expired code");
    }

    const codeMapping = codeData as CodeMapping;

    // Validate client ID
    if (codeMapping.clientId !== clientId) {
      throw new Error("invalid_grant: Client ID mismatch");
    }

    // Validate PKCE
    const isValidPkce = await verifyCodeChallenge(
      codeVerifier,
      codeMapping.codeChallenge
    );
    if (!isValidPkce) {
      throw new Error("invalid_grant: Invalid code verifier");
    }

    // Delete used code (one-time use)
    await this.env.OAUTH_KV.delete(`${CODE_PREFIX}${code}`);

    return codeMapping.tokens;
  }

  /**
   * Refresh access tokens using a refresh token
   * Proxies the request to the upstream Sectors OAuth provider.
   * 
   * @param refreshToken - The refresh token
   * @returns New OAuth tokens
   * @throws Error if refresh fails
   */
  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch("https://api.sectors.app/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.env.SECTORS_OAUTH_CLIENT_ID,
        ...(this.env.SECTORS_OAUTH_CLIENT_SECRET && {
          client_secret: this.env.SECTORS_OAUTH_CLIENT_SECRET,
        }),
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error_description?: string;
      };
      throw new Error(
        errorData.error_description || "Failed to refresh token"
      );
    }

    return response.json();
  }

  /**
   * Verify an access token
   * Attempts to introspect the token via the upstream provider,
   * falling back to pass-through verification if introspection fails.
   * 
   * @param token - The access token to verify
   * @returns Authentication info
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      // Try token introspection endpoint
      const response = await fetch(
        "https://api.sectors.app/oauth/introspect/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token,
            client_id: this.env.SECTORS_OAUTH_CLIENT_ID,
            ...(this.env.SECTORS_OAUTH_CLIENT_SECRET && {
              client_secret: this.env.SECTORS_OAUTH_CLIENT_SECRET,
            }),
          }),
        }
      );

      if (response.ok) {
        const introspection = (await response.json()) as {
          active?: boolean;
          client_id?: string;
          scope?: string;
          exp?: number;
        };
        return {
          valid: introspection.active === true,
          clientId: introspection.client_id,
          scope: introspection.scope,
          expiresAt: introspection.exp
            ? introspection.exp * 1000
            : undefined,
        };
      }

      // If introspection fails, assume token is valid (pass-through)
      // This allows the upstream API to handle validation
      return { valid: true };
    } catch (error) {
      // Pass-through on error
      return { valid: true };
    }
  }

  /**
   * Revoke an access or refresh token
   * Proxies the request to the upstream Sectors OAuth provider.
   * 
   * @param token - The token to revoke
   */
  async revokeToken(token: string): Promise<void> {
    await fetch("https://api.sectors.app/oauth/revoke_token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token,
        client_id: this.env.SECTORS_OAUTH_CLIENT_ID,
        ...(this.env.SECTORS_OAUTH_CLIENT_SECRET && {
          client_secret: this.env.SECTORS_OAUTH_CLIENT_SECRET,
        }),
      }),
    });
  }
}

export default SectorsOAuthProvider;
