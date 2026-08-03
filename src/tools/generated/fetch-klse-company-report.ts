import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchKlseCompanyReport(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  sections?: ("dividend" | "financials" | "overview" | "valuation")[];
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/klse/company/report/${params.symbol}/`);
  if (params.sections !== undefined) {
    url.searchParams.append("sections", String(params.sections));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchKlseCompanyReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-klse-company-report",
    {
      description: "<Note>KLSE symbol: 4-digit numeric code. E.g. `1155`, `4197`, `5225`.</Note>\n\nReturns a comprehensive company report organized into distinct sections. Use `sections` to fetch only the data you need and reduce response size.\n\n<Accordion title=\"Available sections\">\n- **overview**: Market cap, volume, sector, sub-sector, price changes (1d/7d)\n- **valuation**: PE, PB, PS, PCF ratios (TTM and historical)\n- **financials**: Historical revenue and earnings by year, EPS, margins, ratios\n- **dividend**: Dividend history and yield\n</Accordion>\n\n<Info>Costs 1 API credit per requested section. Default behavior (all 4 sections) consumes 4 credits.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("KLSE symbol symbol (4-digit numeric code). E.g. `1155`, `4197`."),
      sections: z.array(z.enum(["dividend", "financials", "overview", "valuation"]))
        .describe("Comma-separated sections to include. Options: `overview`, `valuation`, `financials`, `dividend`. Default: all sections.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchKlseCompanyReport(baseUrl, apiKey, params);
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
