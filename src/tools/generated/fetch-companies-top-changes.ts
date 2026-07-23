import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchCompaniesTopChanges(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  sub_sector?: string;
  n_stock?: number;
  classifications?: string;
  periods?: string;
  min_mcap_billion?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/companies/top-changes/`);
  if (params.sub_sector !== undefined) {
    url.searchParams.append("sub_sector", String(params.sub_sector));
  }
  if (params.n_stock !== undefined) {
    url.searchParams.append("n_stock", String(params.n_stock));
  }
  if (params.classifications !== undefined) {
    url.searchParams.append("classifications", String(params.classifications));
  }
  if (params.periods !== undefined) {
    url.searchParams.append("periods", String(params.periods));
  }
  if (params.min_mcap_billion !== undefined) {
    url.searchParams.append("min_mcap_billion", String(params.min_mcap_billion));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchCompaniesTopChangesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-companies-top-changes",
    "Returns top gainers and losers across multiple time periods. Supports two classifications (`top_gainers`, `top_losers`) and five periods (`1d`, `7d`, `14d`, `30d`, `365d`).\n\n<Info>Costs 1 API credit per requested classification × period combination. Default behavior (2 classifications × 5 periods) consumes 10 credits.</Info>",
    {
      sub_sector: z.string()
        .describe("Filter by kebab-case subsector slug. E.g. `banks`. Get valid values from the [Subsectors](./helper-list/subsectors) endpoint.").optional(),
      n_stock: z.number()
        .describe("Number of companies per period. Default 5, max 10.").optional(),
      classifications: z.string()
        .describe("Comma-separated. Choices: `top_gainers`, `top_losers`. Default: both.").optional(),
      periods: z.string()
        .describe("Comma-separated periods. Choices: `1d`, `7d`, `14d`, `30d`, `365d`. Default: all.").optional(),
      min_mcap_billion: z.number()
        .describe("Minimum market cap filter in billion IDR. Default 5000.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchCompaniesTopChanges(baseUrl, apiKey, params);
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
