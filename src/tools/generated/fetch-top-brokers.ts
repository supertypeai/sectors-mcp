import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchTopBrokers(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  cohort?: "all" | "institutional" | "mixed" | "retail" | "unknown";
  date?: string;
  metric?: "gross" | "net";
  n_brokers?: number;
  origin?: "all" | "domestic" | "foreign";
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/brokers/top/`);
  if (params.cohort !== undefined) {
    url.searchParams.append("cohort", String(params.cohort));
  }
  if (params.date !== undefined) {
    url.searchParams.append("date", String(params.date));
  }
  if (params.metric !== undefined) {
    url.searchParams.append("metric", String(params.metric));
  }
  if (params.n_brokers !== undefined) {
    url.searchParams.append("n_brokers", String(params.n_brokers));
  }
  if (params.origin !== undefined) {
    url.searchParams.append("origin", String(params.origin));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchTopBrokersTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-top-brokers",
    "Brokers ranked by gross trade value (default) or absolute net flow for a single date. Optionally filter by `origin` (foreign/domestic) and `cohort` (retail/mixed/institutional/unknown). Returns all matching brokers if `n_brokers` is omitted.\n\n<Note>Origin and cohort classifications come from the broker registry. Retrieve the full list with these classifications from the [Broker Registry](./broker-registry) endpoint.</Note>\n\n<Info>Costs 2 API credits.</Info>",
    {
      cohort: z.enum(["all", "institutional", "mixed", "retail", "unknown"])
        .describe("Filter by broker cohort (case-insensitive). Default `all`.").optional(),
      date: z.string()
        .describe("Target date (YYYY-MM-DD). Default: latest available.").optional(),
      metric: z.enum(["gross", "net"])
        .describe("`gross` ranks by total buy + sell value; `net` ranks by absolute net flow. Default `gross`.").optional(),
      n_brokers: z.number()
        .describe("How many brokers to return. Default: all matching (~88 total). Max 90.").optional(),
      origin: z.enum(["all", "domestic", "foreign"])
        .describe("Filter by broker origin. Default `all`.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchTopBrokers(baseUrl, apiKey, params);
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
