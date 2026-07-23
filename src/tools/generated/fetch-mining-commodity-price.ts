import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningCommodityPrice(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  commodity_name: string;
  start_year?: number;
  end_year?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/commodities/${params.commodity_name}/price/`);
  if (params.start_year !== undefined) {
    url.searchParams.append("start_year", String(params.start_year));
  }
  if (params.end_year !== undefined) {
    url.searchParams.append("end_year", String(params.end_year));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningCommodityPriceTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-commodity-price",
    "Retrieves historical price data for a commodity by year range. Data is monthly (bi-weekly for recent Coal entries). Maximum range: 3 years.\n\n<Note>Use [List Commodities](../commodities-trade/commodities) to discover all available commodity names.</Note>\n\n<Warning>Requesting more than 3 years will return a 400 error.</Warning>\n\n<Info>Costs 1 API credit.</Info>",
    {
      commodity_name: z.string()
        .describe("The commodity name (e.g., `Gold`, `Coal`). Get valid names from the [List Commodities](../commodities-trade/commodities) endpoint."),
      start_year: z.number()
        .describe("Start year (e.g., `2022`). Defaults to current year − 2.").optional(),
      end_year: z.number()
        .describe("End year inclusive (e.g., `2024`). Defaults to current year. Maximum 3-year range from `start_year`.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningCommodityPrice(baseUrl, apiKey, params);
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
