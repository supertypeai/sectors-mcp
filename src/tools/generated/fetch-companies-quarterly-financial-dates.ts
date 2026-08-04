import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchCompaniesQuarterlyFinancialDates(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  year?: number;
  limit?: number;
  offset?: number;
  since?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/companies/quarterly-financial-dates/`);
  if (params.year !== undefined) {
    url.searchParams.append("year", String(params.year));
  }
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.append("offset", String(params.offset));
  }
  if (params.since !== undefined) {
    url.searchParams.append("since", String(params.since));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchCompaniesQuarterlyFinancialDatesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-companies-quarterly-financial-dates",
    "Returns the **latest** available quarterly report date (and its quarter label) for **every** IDX company in one paginated feed — instead of calling the per-symbol [Quarterly Financial Dates](./company-quarterly-dates) helper once per ticker.\n\nBuilt for **freshness polling**: store the dates you've seen, then re-poll with `?since=` to fetch only the companies that have since reported a new quarter, keeping repeat polls cheap.\n\n**Related:** [Quarterly Financials](../report/quarterly-financials) for the actual figures on a given `report_date`.\n\n<Note>One row per company (~950), sorted by symbol. Companies with no quarterly data are omitted.</Note>\n\n<Info>Costs 1 API credit per page. The full universe is ~32 pages at the maximum `limit` of 30 (~32 credits per full sweep). Use `since` to poll incrementally for far fewer credits.</Info>",
    {
      year: z.number()
        .describe("Restrict to report dates within this calendar year, then return each company's latest quarter within it (e.g. `2024`).").optional(),
      limit: z.number()
        .describe("Maximum number of companies to return per page. Max: 30.").optional(),
      offset: z.number()
        .describe("Number of companies to skip for pagination.").optional(),
      since: z.string()
        .describe("Return only companies whose latest quarter-end date is on or after this date (`YYYY-MM-DD`). Use it to poll for newly-reported quarters. A future date returns an empty result set.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchCompaniesQuarterlyFinancialDates(baseUrl, apiKey, params);
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
