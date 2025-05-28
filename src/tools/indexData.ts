import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface IndexResponse {
  // Add appropriate interface properties based on the API response
  [key: string]: any;
}

export async function fetchIndex(
  baseUrl: string,
  apiKey: string | undefined,
  index: string
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/index/${index}/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<IndexResponse>(response);
}

export function registerIndexTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-index",
    "Fetch index data from the Sectors API",
    {
      index: z.string().describe("The index to fetch data for"),
    },
    async ({ index }) => {
      try {
        const indexData = await fetchIndex(baseUrl, apiKey, index);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/index/${index}\n\nFetched index data:\n\n${JSON.stringify(
                indexData,
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
