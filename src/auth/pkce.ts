/**
 * PKCE (Proof Key for Code Exchange) Implementation
 * 
 * Implements PKCE using the Web Crypto API for the OAuth 2.0
 * authorization code flow. This provides protection against
 * authorization code interception attacks.
 * 
 * RFC 7636: Proof Key for Code Exchange by OAuth Public Clients
 */

/**
 * Generate a random code verifier (43-128 characters)
 * Uses crypto.getRandomValues for secure random generation
 * @returns A base64url-encoded random string
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate a code challenge from a code verifier using S256
 * @param verifier - The code verifier
 * @returns The base64url-encoded SHA-256 hash of the verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Verify a code challenge against a code verifier
 * @param verifier - The code verifier
 * @param challenge - The code challenge to verify
 * @returns True if the challenge matches the verifier
 */
export async function verifyCodeChallenge(
  verifier: string,
  challenge: string
): Promise<boolean> {
  const computedChallenge = await generateCodeChallenge(verifier);
  return timingSafeEqual(computedChallenge, challenge);
}

/**
 * Base64url encode a Uint8Array
 * Replaces + with -, / with _, and removes padding
 * @param buffer - The buffer to encode
 * @returns Base64url-encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
