// Environment variables
export const SECTORS_API_BASE = process.env.SECTORS_API_BASE || "https://api.sectors.app/v2";
export const SECTORS_API_KEY = process.env.SECTORS_API_KEY || "";

// Server configuration
export const SERVER_CONFIG = {
  name: "sectors-mcp",
  version: "1.0.0"
};

// OAuth configuration
export const SECTORS_OAUTH_BASE = "https://api.sectors.app";

export const OAUTH_ENDPOINTS = {
  authorize: `${SECTORS_OAUTH_BASE}/oauth/authorize/`,
  token: `${SECTORS_OAUTH_BASE}/oauth/token/`,
  revoke: `${SECTORS_OAUTH_BASE}/oauth/revoke_token/`,
  introspect: `${SECTORS_OAUTH_BASE}/oauth/introspect/`,
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
