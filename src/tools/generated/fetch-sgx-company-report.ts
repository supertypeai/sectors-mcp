import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSgxCompanyReport(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  sections?: ("dividend" | "financials" | "overview" | "valuation")[];
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/sgx/company/report/${params.symbol}/`);
  if (params.sections !== undefined) {
    url.searchParams.append("sections", String(params.sections));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSgxCompanyReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-company-report",
    "<Note>SGX symbol: 3 characters (letters or digits), optionally followed by `.si` (case-insensitive). E.g. `D05`, `U11`, `Z74`.</Note>\n\nReturns a comprehensive company report organized into distinct sections. Use `sections` to fetch only the data you need and reduce response size.\n\n<Accordion title=\"Available sections\">\n- **overview**: Market cap, volume, sector, sub-sector, price changes (1d/7d/1m/1y/3y/ytd), all-time price highs/lows\n- **valuation**: PE, PS, PCF, PB ratios\n- **financials**: Historical revenue and earnings by year, EPS, margins, ratios\n- **dividend**: Dividend yield, growth rate, payout ratio, historical dividends\n</Accordion>\n\n<Info>Costs 1 API credit per requested section. Default behavior (all 4 sections) consumes 4 credits.</Info>",
    {
      symbol: z.string()
        .describe("SGX symbol symbol. E.g. `D05`, `U11`, `Z74`."),
      sections: z.array(z.enum(["dividend", "financials", "overview", "valuation"]))
        .describe("Comma-separated sections to include. Options: `overview`, `valuation`, `financials`, `dividend`. Default: all sections.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchSgxCompanyReport(baseUrl, apiKey, params);
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
