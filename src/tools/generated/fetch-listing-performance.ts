import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchListingPerformance(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/listing-performance/${params.symbol}/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchListingPerformanceTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-listing-performance",
    {
      description: "Returns price change percentages since listing date for a given IDX-listed symbol, across 7, 30, 90, and 365-day windows.\n\n<Note>Listing performance data is only available for tickers listed **after May 2005**.</Note>\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `GOTO`, `BREN`, `BUKA`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("IDX symbol symbol. E.g. `ARTO`, `BREN`, `GOTO`."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchListingPerformance(baseUrl, apiKey, params);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
