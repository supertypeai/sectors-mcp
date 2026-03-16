/**
 * OAuth Client Registration and Management
 * 
 * Implements RFC 7591 Dynamic Client Registration using Cloudflare KV.
 * Clients register dynamically with the Worker, which then proxies
 * authentication to the upstream Sectors OAuth provider.
 */

import {
  OAuthClientMetadata,
  OAuthClientInformationFull,
} from "./types.js";

const CLIENT_PREFIX = "client:";

/**
 * Register a new OAuth client
 * @param kv - KV namespace for storage
 * @param metadata - Client registration metadata
 * @returns Full client information including issued client_id
 */
export async function registerClient(
  kv: KVNamespace,
  metadata: OAuthClientMetadata
): Promise<OAuthClientInformationFull> {
  // Generate unique client ID
  const clientId = `mcp-${crypto.randomUUID()}`;
  const issuedAt = Math.floor(Date.now() / 1000);

  const clientInfo: OAuthClientInformationFull = {
    ...metadata,
    client_id: clientId,
    client_id_issued_at: issuedAt,
  };

  // Store in KV (no TTL - clients persist until deleted)
  await kv.put(
    `${CLIENT_PREFIX}${clientId}`,
    JSON.stringify(clientInfo)
  );

  return clientInfo;
}

/**
 * Retrieve a registered client by ID
 * @param kv - KV namespace for storage
 * @param clientId - The client ID to look up
 * @returns Client information or null if not found
 */
export async function getClient(
  kv: KVNamespace,
  clientId: string
): Promise<OAuthClientInformationFull | null> {
  const data = await kv.get(`${CLIENT_PREFIX}${clientId}`, { type: "json" });
  if (!data) return null;
  return data as OAuthClientInformationFull;
}

/**
 * Validate that a redirect URI is registered for the client
 * @param client - The registered client
 * @param redirectUri - The redirect URI to validate
 * @returns True if the URI is in the client's allowed list
 */
export function validateRedirectUri(
  client: OAuthClientInformationFull,
  redirectUri: string
): boolean {
  return client.redirect_uris.includes(redirectUri);
}

/**
 * Delete a registered client
 * @param kv - KV namespace for storage
 * @param clientId - The client ID to delete
 */
export async function deleteClient(
  kv: KVNamespace,
  clientId: string
): Promise<void> {
  await kv.delete(`${CLIENT_PREFIX}${clientId}`);
}

/**
 * List all registered clients (for admin purposes)
 * @param kv - KV namespace for storage
 * @returns Array of all registered clients
 */
export async function listClients(
  kv: KVNamespace
): Promise<OAuthClientInformationFull[]> {
  const { keys } = await kv.list({ prefix: CLIENT_PREFIX });
  const clients: OAuthClientInformationFull[] = [];

  for (const key of keys) {
    const client = await kv.get(key.name, { type: "json" });
    if (client) {
      clients.push(client as OAuthClientInformationFull);
    }
  }

  return clients;
}
