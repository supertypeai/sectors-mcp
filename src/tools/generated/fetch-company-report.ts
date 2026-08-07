import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchCompanyReport(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  sections?: ("dividend" | "financials" | "future" | "management" | "overview" | "ownership" | "peers" | "valuation")[];
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/company/report/${params.symbol}/`);
  if (params.sections !== undefined) {
    url.searchParams.append("sections", String(params.sections));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchCompanyReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-company-report",
    {
      description: "Returns a comprehensive company report organized into distinct sections. By default all sections are included. Use `sections` to request only the data you need and reduce response size.\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BREN`, `BBCA`, `TLKM`.</Note>\n\n<Accordion title=\"Available sections\">\n- **overview**: Company identity, market cap, price history, ESG score, tags, indices, affiliates\n- **valuation**: Close price, forward PE, intrinsic value, historical valuation (PB, PE, PS, PCF, PEG by year)\n- **future**: Analyst forecasts, EPS growth estimates\n- **peers**: Peer comparison within the same subsector\n- **financials**: Historical annual financials (revenue, earnings, assets, equity, margins)\n- **dividend**: Dividend history, yield, payout ratio\n- **management**: Key executives and their shareholdings\n- **ownership**: Major shareholders and ownership structure\n</Accordion>\n\n<Info>Costs 1 API credit per requested section. Default behavior (all 8 sections) consumes 8 credits.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("IDX symbol symbol. E.g. `BREN`, `BBCA`."),
      sections: z.array(z.enum(["dividend", "financials", "future", "management", "overview", "ownership", "peers", "valuation"]))
        .describe("Comma-separated list of sections to include. Default to all.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchCompanyReport(baseUrl, apiKey, params);
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
