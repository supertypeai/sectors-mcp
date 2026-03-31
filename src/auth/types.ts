/**
 * OAuth Type Definitions
 * 
 * TypeScript interfaces for OAuth 2.0 data structures used in the
 * Sectors MCP server's double-proxy authentication architecture.
 */

/**
 * OAuth token response from upstream provider
 */
export interface OAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Stored authorization session during OAuth flow
 * TTL: 10 minutes
 */
export interface AuthSession {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  upstreamCodeVerifier: string;
  createdAt: number;
}

/**
 * Maps local authorization codes to upstream tokens
 * TTL: 10 minutes
 */
export interface CodeMapping {
  tokens: OAuthTokens;
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  createdAt: number;
}

/**
 * RFC 7591 OAuth client registration metadata
 */
export interface OAuthClientMetadata {
  redirect_uris: string[];
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope?: string;
}

/**
 * Full client information including issued client_id
 */
export interface OAuthClientInformationFull extends OAuthClientMetadata {
  client_id: string;
  client_id_issued_at: number;
}

/**
 * OAuth authorization request parameters
 */
export interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope?: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state?: string | null;
}

/**
 * OAuth token request parameters
 */
export interface TokenRequest {
  grantType: string;
  code?: string;
  redirectUri?: string;
  clientId: string;
  codeVerifier?: string;
  refreshToken?: string;
}

/**
 * OAuth error response (RFC 6749)
 */
export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

/**
 * OAuth protected resource metadata (RFC 8414)
 */
export interface OAuthProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  resource_name?: string;
}

/**
 * OAuth authorization server metadata (RFC 8414)
 */
export interface OAuthAuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  revocation_endpoint?: string;
  introspection_endpoint?: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  code_challenge_methods_supported?: string[];
  scopes_supported: string[];
}

/**
 * Extended environment with OAuth KV bindings
 */
export interface ExtendedEnv {
  SECTORS_API_KEY?: string;
  SECTORS_API_BASE?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SECTORS_OAUTH_CLIENT_ID: string;
  SECTORS_OAUTH_CLIENT_SECRET?: string;
  OAUTH_KV: KVNamespace;
  MCP_OBJECT: DurableObjectNamespace;
}

/**
 * Authentication info returned from token verification
 */
export interface AuthInfo {
  valid: boolean;
  clientId?: string;
  scope?: string;
  expiresAt?: number;
}

/**
 * Result from authorization callback handling
 */
export interface CallbackResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  errorDescription?: string;
}
