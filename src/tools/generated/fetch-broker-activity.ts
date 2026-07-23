import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchBrokerActivity(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  broker_code: string;
  symbol?: string;
  start?: string;
  end?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/broker-activity/${params.broker_code}/`);
  if (params.symbol !== undefined) {
    url.searchParams.append("symbol", String(params.symbol));
  }
  if (params.start !== undefined) {
    url.searchParams.append("start", String(params.start));
  }
  if (params.end !== undefined) {
    url.searchParams.append("end", String(params.end));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchBrokerActivityTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-broker-activity",
    "All (stock, day) trading activity for one broker over a date range up to 14 days, grouped by date. Optionally filter to a single stock via `symbol`. Each entry in `data` lists every stock the broker touched that day with buy/sell/net values.\n\n<Note>Broker codes are the two-letter exchange-member identifiers (e.g. `MG`, `AK`, `CC`). Retrieve the full list of valid codes from the [Broker Registry](./broker-registry) endpoint.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      broker_code: z.string()
        .describe("Broker code. E.g. `MG`, `AK`, `CC`."),
      symbol: z.string()
        .describe("Optional filter to a single stock ticker (e.g. `BBCA`).").optional(),
      start: z.string()
        .describe("Start date (YYYY-MM-DD). Default: end - 14 days.").optional(),
      end: z.string()
        .describe("End date (YYYY-MM-DD). Default: today.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchBrokerActivity(baseUrl, apiKey, params);
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
