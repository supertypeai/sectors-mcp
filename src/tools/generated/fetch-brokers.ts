import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchBrokers(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  cohort?: "institutional" | "mixed" | "retail" | "unknown";
  origin?: "domestic" | "foreign";
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/brokers/`);
  if (params.cohort !== undefined) {
    url.searchParams.append("cohort", String(params.cohort));
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

export function registerFetchBrokersTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-brokers",
    {
      description: "Curated registry of IDX exchange-member brokers with name, origin (foreign / domestic), cohort (retail / mixed / institutional / unknown), and license type. Use this as the authoritative source for valid broker codes when calling broker-scoped endpoints such as `/v2/broker-activity/{broker_code}/`.\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      cohort: z.enum(["institutional", "mixed", "retail", "unknown"])
        .describe("Optional filter by broker cohort (case-insensitive).").optional(),
      origin: z.enum(["domestic", "foreign"])
        .describe("Optional filter by broker origin.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchBrokers(baseUrl, apiKey, params);
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
