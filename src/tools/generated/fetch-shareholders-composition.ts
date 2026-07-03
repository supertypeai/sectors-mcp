import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchShareholdersComposition(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  year?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/company/shareholders-composition/${params.symbol}/`);
  if (params.year !== undefined) {
    url.searchParams.append("year", String(params.year));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchShareholdersCompositionTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-shareholders-composition",
    "<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BBCA`, `BMRI`, `TLKM`.</Note>\n\nReturns monthly shareholder composition snapshots for a given IDX-listed company within a single calendar year, broken down by investor category (insurance, corporate, pension fund, financial institutions, individual, mutual fund, securities companies, foundation, other) for both local (`_l`) and foreign (`_f`) investors.\n\n<Note>Data is available from 2021 onwards. Querying earlier years returns an empty `data` array.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      symbol: z.string()
        .describe("IDX symbol. E.g. `BBCA`, `BMRI`."),
      year: z.number()
        .describe("Calendar year (e.g. `2025`). Defaults to the current year. Data is available from 2021; earlier years return an empty `data` array. Future years are rejected.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchShareholdersComposition(baseUrl, apiKey, params);
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
