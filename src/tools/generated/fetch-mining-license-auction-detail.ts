import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningLicenseAuctionDetail(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  wiup_code: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/license-auctions/${params.wiup_code}/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningLicenseAuctionDetailTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-license-auction-detail",
    "Retrieves the full record for a single mining license auction by its WIUP code, including the parsed phases timeline and participant qualification list.\n\n<Info>Costs 1 API credit.</Info>",
    {
      wiup_code: z.string()
        .describe("The unique WIUP code identifier for the auction."),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningLicenseAuctionDetail(baseUrl, apiKey, params);
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
