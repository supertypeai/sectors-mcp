import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface Company {
  symbol: string;
  company_name: string;
}

export async function fetchCompaniesByIndex(
  baseUrl: string,
  apiKey: string | undefined,
  index: string
): Promise<Company[]> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/index/${index}/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<Company[]>(response);
}

// Available index types for TypeScript type checking
export type IndexType =
  | "ftse"
  | "idx30"
  | "idxbumn20"
  | "idxesgl"
  | "idxg30"
  | "idxhidiv20"
  | "idxq30"
  | "idxv30"
  | "jii70"
  | "kompas100"
  | "lq45"
  | "sminfra18"
  | "srikehati"
  | "economic30"
  | "idxvesta28";

export function registerCompaniesByIndexTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-companies-by-index",
    "Fetch companies by stock index from the Sectors API",
    {
      index: z
        .string()
        .describe("The index name (e.g., 'lq45', 'idx30', 'kompas100')"),
    },
    async ({ index }) => {
      try {
        const companies = await fetchCompaniesByIndex(baseUrl, apiKey, index);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/index/${index}/constituents\n\nFetched companies for index ${index}:\n\n${JSON.stringify(
                companies,
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
