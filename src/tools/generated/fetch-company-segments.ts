import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchCompanySegments(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  financial_year?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/company/get-segments/${params.symbol}/`);
  if (params.financial_year !== undefined) {
    url.searchParams.append("financial_year", String(params.financial_year));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchCompanySegmentsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-company-segments",
    {
      description: "Returns a Sankey-graph-ready revenue and cost segment breakdown for a given company and financial year. Not all companies have segment data — use the [Companies with Revenue Segments](../helper-list/companies-segments-list) endpoint to check availability.\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BUMI`, `TLKM`, `ASII`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("IDX symbol symbol. E.g. `BUMI`, `TLKM`. Not all companies have segment data — check the [Companies with Revenue Segments](../helper-list/companies-segments-list) helper first."),
      financial_year: z.number()
        .describe("Financial year to retrieve. Defaults to the latest available year.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchCompanySegments(baseUrl, apiKey, params);
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
