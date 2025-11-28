import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

/**
 * Fetches all available sectors in the SGX Index
 * @param baseUrl - Base URL of the Sectors API
 * @param apiKey - API key for authentication
 * @returns Promise with an array of sector names
 */
export async function fetchSgxSectors(
  baseUrl: string,
  apiKey: string | undefined
): Promise<string[]> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/sgx/sectors/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<string[]>(response);
}

/**
 * Registers the SGX sectors tool with the MCP server
 * @param server - MCP server instance
 * @param baseUrl - Base URL of the Sectors API
 * @param apiKey - API key for authentication
 */
export function registerSgxSectorsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-sectors",
    "Fetch list of all available sectors in SGX Index",
    async () => {
      try {
        const sectors = await fetchSgxSectors(baseUrl, apiKey);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/sgx/sectors/\n\nAvailable SGX sectors:\n\n${sectors
                .map((sector) => `• ${sector}`)
                .join("\n")}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
