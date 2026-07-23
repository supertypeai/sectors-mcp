import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSubsectorReport(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  sub_sector: string;
  sections?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/subsector/report/${params.sub_sector}/`);
  if (params.sections !== undefined) {
    url.searchParams.append("sections", String(params.sections));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSubsectorReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-subsector-report",
    "Returns a comprehensive report for an IDX subsector, organized into distinct sections. Use `sections` to fetch only the data you need.\n\n<Note>The `sub_sector` path parameter must be in **kebab-case** format. Get valid values from the [Subsectors](./helper-list/subsectors) endpoint. E.g. `banks`, `utilities`, `food-beverage`.</Note>\n\n<Accordion title=\"Available sections\">\n- **statistics**: Company count, median PE, weighted avg PE, min/max PE\n- **market_cap**: Total and avg market cap, quarterly market cap trend, mcap change (1w/1y/YTD)\n- **stability**: Weighted max drawdown, weighted relative standard deviation\n- **valuation**: Historical PB, PE, PS, PCF by year\n- **growth**: Weighted avg revenue and earnings growth\n- **companies**: List of companies in the subsector with key metrics\n</Accordion>\n\n<Info>Costs 1 API credit per requested section. Default behavior (all 6 sections) consumes 6 credits.</Info>",
    {
      sub_sector: z.string()
        .describe("Kebab-case subsector slug. E.g. `banks`, `utilities`. Get valid values from the [Subsectors](./helper-list/subsectors) endpoint."),
      sections: z.string()
        .describe("Comma-separated sections to include. Default to all.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchSubsectorReport(baseUrl, apiKey, params);
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
