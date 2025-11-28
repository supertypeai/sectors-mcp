import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface SubindustryResponse {
  // Add appropriate interface properties based on the API response
  [key: string]: any;
}

export async function fetchSubIndustries(
  baseUrl: string,
  apiKey: string | undefined
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/subindustries/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<SubindustryResponse[]>(response);
}

export function registerSubIndustriesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-subindustries",
    "Fetch subindustries from the Sectors API",
    async () => {
      try {
        const subIndustriesData = await fetchSubIndustries(baseUrl, apiKey);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/subindustries\n\nFetched subindustries:\n\n${JSON.stringify(
                subIndustriesData,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
