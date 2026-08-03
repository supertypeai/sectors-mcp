import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchBrokerActivityTop(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  broker_code: string;
  start?: string;
  end?: string;
  n_brokers?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/broker-activity/${params.broker_code}/top/`);
  if (params.start !== undefined) {
    url.searchParams.append("start", String(params.start));
  }
  if (params.end !== undefined) {
    url.searchParams.append("end", String(params.end));
  }
  if (params.n_brokers !== undefined) {
    url.searchParams.append("n_brokers", String(params.n_brokers));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchBrokerActivityTopTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-broker-activity-top",
    {
      description: "Returns the stocks a single broker has been most actively accumulating and distributing over a date range. `top_accumulations` ranks stocks the broker has net bought (largest positive net IDR first); `top_distributions` ranks stocks the broker has net sold (largest negative net IDR first). Useful for tracking a specific broker's directional positioning across the IDX universe.\n\n<Note>Broker codes are the two-letter exchange-member identifiers (e.g. `MG`, `AK`, `CC`). Retrieve the full list of valid codes from the [Broker Registry](./broker-registry) endpoint.</Note>\n\n<Info>Costs 2 API credits.</Info>",
      inputSchema: z.object({
      broker_code: z.string()
        .describe("Broker code. E.g. `MG`, `AK`, `CC`."),
      start: z.string()
        .describe("Start date (YYYY-MM-DD). Default: end - 30 days.").optional(),
      end: z.string()
        .describe("End date (YYYY-MM-DD). Default: today.").optional(),
      n_brokers: z.number()
        .describe("How many accumulations and distributions to return each (default 10, max 90).").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchBrokerActivityTop(baseUrl, apiKey, params);
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
