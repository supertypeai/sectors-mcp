import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SubsectorResponse } from "../types/api.js";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export async function getSubsectors(
  baseUrl: string,
  apiKey: string | undefined
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY not found");
  }

  const response = await fetch(`${baseUrl}/subsectors/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  const data = await handleApiResponse<SubsectorResponse[]>(response);
  return data
    .map((item) => `• Sector : ${item.sector}, Subsector : ${item.subsector}`)
    .join("\n");
}

export function registerSubsectorsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool("get-subsectors", "Get list of subsectors", async () => {
    try {
      const subsectorsText = await getSubsectors(baseUrl, apiKey);
      return {
        content: [
          {
            type: "text",
            text: `API URL: ${baseUrl}/subsectors\n\n${subsectorsText}`,
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  });
}
