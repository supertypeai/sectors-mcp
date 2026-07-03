import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchCorporateActions(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/company/corporate-actions/${params.symbol}/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchCorporateActionsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-corporate-actions",
    "<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BBCA`, `BMRI`, `TLKM`.</Note>\n\nReturns all corporate action history for a given IDX-listed company: stock splits, right issues, warrants, bonus shares, AGM events, upcoming dividends, and historical dividends.\n\n<Info>Costs 1 API credit.</Info>",
    {
      symbol: z.string()
        .describe("IDX symbol. E.g. `BBCA`, `BMRI`."),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchCorporateActions(baseUrl, apiKey, params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
