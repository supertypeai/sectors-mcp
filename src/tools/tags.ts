import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export async function fetchTags(
  baseUrl: string,
  apiKey: string | undefined
): Promise<string[]> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/tags/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<string[]>(response);
}

export function registerTagsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-tags",
    "Fetch the list of available news tags (kebab-case) used to filter news and filings.",
    { annotations: { readOnlyHint: true } },
    async () => {
      try {
        const tags = await fetchTags(baseUrl, apiKey);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/tags/\n\n${JSON.stringify(tags, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
