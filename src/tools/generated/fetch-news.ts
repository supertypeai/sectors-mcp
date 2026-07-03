import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchNews(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  sector?: string;
  sub_sector?: string;
  commodity_type?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  tags?: string;
  extension?: "idx" | "mining";
  keyword?: string;
  symbols?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/news/`);
  if (params.sector !== undefined) {
    url.searchParams.append("sector", String(params.sector));
  }
  if (params.sub_sector !== undefined) {
    url.searchParams.append("sub_sector", String(params.sub_sector));
  }
  if (params.commodity_type !== undefined) {
    url.searchParams.append("commodity_type", String(params.commodity_type));
  }
  if (params.start !== undefined) {
    url.searchParams.append("start", String(params.start));
  }
  if (params.end !== undefined) {
    url.searchParams.append("end", String(params.end));
  }
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.append("offset", String(params.offset));
  }
  if (params.tags !== undefined) {
    url.searchParams.append("tags", String(params.tags));
  }
  if (params.extension !== undefined) {
    url.searchParams.append("extension", String(params.extension));
  }
  if (params.keyword !== undefined) {
    url.searchParams.append("keyword", String(params.keyword));
  }
  if (params.symbols !== undefined) {
    url.searchParams.append("symbols", String(params.symbols));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchNewsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-news",
    "Returns paginated news articles from either the IDX (Indonesian Stock Exchange) or mining news sources. Use the `extension` parameter to choose the data source — each extension has its own set of valid filter parameters.\n\n<Warning>Mixing IDX and mining parameters will return a 400 error. E.g. passing `sector` with `extension=mining` is invalid.</Warning>\n\n<Accordion title=\"IDX Extension Parameters (extension=idx)\">\n- **sector**: Comma-separated sector slugs (kebab-case). Get values from the [Subsectors](./helper-list/subsectors) endpoint.\n- **sub_sector**: Comma-separated subsector slugs (kebab-case). E.g. `banks`, `insurance`, `retailing`. Get valid values from the [Subsectors](./helper-list/subsectors) endpoint.\n- **tags**: Comma-separated tag slugs. Get values from the [News Tags](./helper-list/tags) endpoint.\n- **symbols**: Comma-separated IDX symbols. E.g. `BBCA,BBRI,BMRI`.\n- **keyword**: Case-insensitive substring match on article title.\n</Accordion>\n\n<Accordion title=\"Mining Extension Parameters (extension=mining)\">\n- **keyword**: Case-insensitive substring match on article title.\n- **commodity_type**: Filter by commodity. E.g. `Coal`, `Nickel`, `Gold`.\n</Accordion>\n\n<Note>Date filters: both `start` and `end` are independent and optional — omit either side to leave that bound unconstrained. Future `end` dates return 400.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      sector: z.string()
        .describe("**IDX only.** Comma-separated sector slugs (kebab-case).").optional(),
      sub_sector: z.string()
        .describe("**IDX only.** Comma-separated subsector slugs (kebab-case).").optional(),
      commodity_type: z.string()
        .describe("**Mining only.** Filter by commodity type. E.g. `Coal`, `Nickel`.").optional(),
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Optional; if omitted, no lower bound is applied. Filters on `timestamp`.").optional(),
      end: z.string()
        .describe("End date in `YYYY-MM-DD` format. Optional; if omitted, no upper bound is applied. Future dates return 400.").optional(),
      limit: z.number()
        .describe("Items per page. Max 30.").optional(),
      offset: z.number()
        .describe("Items to skip for pagination.").optional(),
      tags: z.string()
        .describe("**IDX only.** Comma-separated tag slugs. Get valid values from the [News Tags](../helper-list/tags) endpoint.").optional(),
      extension: z.enum(["idx", "mining"])
        .describe("Data source. Default `idx`.").optional(),
      keyword: z.string()
        .describe("Case-insensitive substring match on article title. Works for both IDX and mining.").optional(),
      symbols: z.string()
        .describe("**IDX only.** Comma-separated IDX symbols. E.g. `BBCA,BBRI`.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchNews(baseUrl, apiKey, params);
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
