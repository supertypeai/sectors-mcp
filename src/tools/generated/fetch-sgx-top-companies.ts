import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSgxTopCompanies(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  sector?: string;
  n_stock?: number;
  classifications?: string;
  min_mcap_million?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/sgx/companies/top/`);
  if (params.sector !== undefined) {
    url.searchParams.append("sector", String(params.sector));
  }
  if (params.n_stock !== undefined) {
    url.searchParams.append("n_stock", String(params.n_stock));
  }
  if (params.classifications !== undefined) {
    url.searchParams.append("classifications", String(params.classifications));
  }
  if (params.min_mcap_million !== undefined) {
    url.searchParams.append("min_mcap_million", String(params.min_mcap_million));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSgxTopCompaniesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-top-companies",
    "Returns top SGX-listed companies ranked by one or more classifications.\n\n<Accordion title=\"Available classifications\">\n`dividend_yield`, `revenue`, `earnings`, `market_cap`, `pe`\n</Accordion>\n\n<Note>Get valid sector slugs from the [SGX Sectors](../singapore/sgx-sectors) endpoint.</Note>\n\n<Info>Costs 1 API credit per requested classification. Default behavior (all 5 classifications) consumes 5 credits.</Info>",
    {
      sector: z.string()
        .describe("Filter by sector slug. E.g. `financial-services`, `technology`. Default: all sectors.").optional(),
      n_stock: z.number()
        .describe("Number of top companies to return per classification. Max 10. Default: 5.").optional(),
      classifications: z.string()
        .describe("Comma-separated list of classifications. Options: `dividend_yield`, `revenue`, `earnings`, `market_cap`, `pe`. Default: all.").optional(),
      min_mcap_million: z.number()
        .describe("Minimum market cap in million SGD. Default: 1000.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchSgxTopCompanies(baseUrl, apiKey, params);
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
