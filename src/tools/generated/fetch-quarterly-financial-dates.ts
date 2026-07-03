import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchQuarterlyFinancialDates(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/company/get_quarterly_financial_dates/${params.symbol}/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchQuarterlyFinancialDatesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-quarterly-financial-dates",
    "Returns all available quarterly financial report dates for a given symbol, grouped by year. Use the `report_date` values returned here as inputs to the `report_date` parameter in the Quarterly Financials endpoint.\n\n**Used by:** [Company Quarterly Financials](../report/quarterly-financials)\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `ASII`, `BBCA`, `BMRI`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      symbol: z.string()
        .describe("IDX symbol symbol. E.g. `ASII`, `BBCA`."),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchQuarterlyFinancialDates(baseUrl, apiKey, params);
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
