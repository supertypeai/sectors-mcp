import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchQuarterlyFinancials(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  report_date?: string;
  approx?: boolean;
  n_quarters?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/financials/quarterly/${params.symbol}/`);
  if (params.report_date !== undefined) {
    url.searchParams.append("report_date", String(params.report_date));
  }
  if (params.approx !== undefined) {
    url.searchParams.append("approx", String(params.approx));
  }
  if (params.n_quarters !== undefined) {
    url.searchParams.append("n_quarters", String(params.n_quarters));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchQuarterlyFinancialsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-quarterly-financials",
    {
      description: "Returns quarterly financial data for a given IDX symbol. Fields vary by sector — financial-sector companies (banks, insurance) have additional metrics like `net_interest_income`, `gross_loan`, `total_deposit`.\n\n<Note>Use the [Quarterly Financial Dates](../helper-list/company-quarterly-dates) endpoint to get valid `report_date` values for a symbol.</Note>\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BMRI`, `BBCA`, `TLKM`.</Note>\n\n<Info>Costs 1 API credit per quarter returned.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("IDX symbol symbol. E.g. `BMRI`, `BBCA`."),
      report_date: z.string()
        .describe("Specific report date (YYYY-MM-DD). Use the [Quarterly Financial Dates](../helper-list/company-quarterly-dates) endpoint to get valid values.").optional(),
      approx: z.boolean()
        .describe("If `true` (default), use approximate quarter matching when an exact date is not found.").optional(),
      n_quarters: z.number()
        .describe("Number of most recent quarters to return.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchQuarterlyFinancials(baseUrl, apiKey, params);
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
