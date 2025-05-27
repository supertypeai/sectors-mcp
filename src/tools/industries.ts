import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IndustryResponse } from "../types/api.js";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export async function getIndustries(
  baseUrl: string,
  apiKey: string | undefined
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY not found");
  }

  const response = await fetch(`${baseUrl}/industries/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  const data = await handleApiResponse<IndustryResponse[]>(response);
  return data
    .map(
      (result) =>
        `- Subsector: ${result.subsector}\n- Industry: ${result.industry}`
    )
    .join("\n");
}

export function registerIndustriesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-industries",
    "Fetch industries from the Sectors API",
    async () => {
      try {
        const industriesText = await getIndustries(baseUrl, apiKey);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/industries\n\n${industriesText}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
