import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface GrowthCompany {
  symbol: string;
  company_name: string;
}

export interface TopGrowthResponse {
  top_earnings_growth_gainers: GrowthCompany[];
  top_earnings_growth_losers: GrowthCompany[];
  top_revenue_growth_gainers: GrowthCompany[];
  top_revenue_growth_losers: GrowthCompany[];
}

interface ScreenerEnvelope {
  results: GrowthCompany[];
  pagination: {
    total_count: number;
    showing: number;
    limit: number;
    offset: number;
    has_next: boolean;
    has_previous: boolean;
    next_offset: number | null;
    previous_offset: number | null;
  };
}

const GROWTH_BUCKETS = [
  "top_earnings_growth_gainers",
  "top_earnings_growth_losers",
  "top_revenue_growth_gainers",
  "top_revenue_growth_losers",
] as const;

type GrowthBucket = (typeof GROWTH_BUCKETS)[number];

const BUCKET_TO_ORDER: Record<
  GrowthBucket,
  { field: string; direction: "asc" | "desc" }
> = {
  top_earnings_growth_gainers: {
    field: "yoy_quarter_earnings_growth",
    direction: "desc",
  },
  top_earnings_growth_losers: {
    field: "yoy_quarter_earnings_growth",
    direction: "asc",
  },
  top_revenue_growth_gainers: {
    field: "yoy_quarter_revenue_growth",
    direction: "desc",
  },
  top_revenue_growth_losers: {
    field: "yoy_quarter_revenue_growth",
    direction: "asc",
  },
};

function buildWhereClause(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p)).join(" and ");
}

export async function fetchTopGrowth(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
    classifications?: string;
    n_stock?: number;
    min_mcap_billion?: number;
    sub_sector?: string;
  } = {}
): Promise<TopGrowthResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const {
    classifications = "all",
    n_stock = 5,
    min_mcap_billion = 5000,
    sub_sector = "all",
  } = params;

  const requested: GrowthBucket[] =
    classifications === "all"
      ? [...GROWTH_BUCKETS]
      : (classifications
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean) as GrowthBucket[]);

  const invalid = requested.filter((b) => !GROWTH_BUCKETS.includes(b));
  if (invalid.length > 0) {
    throw new Error(
      `Unsupported classifications: ${invalid.join(", ")}. Valid: ${GROWTH_BUCKETS.join(", ")}`
    );
  }

  const subSectorClause =
    sub_sector && sub_sector !== "all" ? `sub_sector='${sub_sector}'` : null;
  const minMcapClause =
    min_mcap_billion > 0
      ? `market_cap>=${min_mcap_billion * 1_000_000_000}`
      : null;

  const headers = createApiHeaders(apiKey);

  const empty: TopGrowthResponse = {
    top_earnings_growth_gainers: [],
    top_earnings_growth_losers: [],
    top_revenue_growth_gainers: [],
    top_revenue_growth_losers: [],
  };

  await Promise.all(
    requested.map(async (bucket) => {
      const { field, direction } = BUCKET_TO_ORDER[bucket];
      const where = buildWhereClause([
        subSectorClause,
        minMcapClause,
        `${field} is not null`,
      ]);
      const queryParams = new URLSearchParams({
        order_by: direction === "desc" ? `-${field}` : field,
        limit: String(n_stock),
        where,
      });
      const url = `${baseUrl}/companies/?${queryParams.toString()}`;
      const response = await fetch(url, { method: "GET", headers });
      const envelope = await handleApiResponse<ScreenerEnvelope>(response);
      empty[bucket] = envelope.results;
    })
  );

  return empty;
}

export function registerTopGrowthTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-top-growth-companies",
    `Fetch top companies by year-over-year revenue/earnings growth, backed by the v2 screener.

For each requested bucket (gainers/losers × earnings/revenue), runs an
independent screener call ordered by yoy_quarter_*_growth.

v2 behavior change: ranked rows contain only {symbol, company_name}.
The growth percentage itself is not returned per row (the screener does
not support field projection). To inspect a value, follow up with
fetch-company-report on the ticker.`,
    {
      classifications: z
        .string()
        .optional()
        .default("all")
        .describe(
          `Comma-separated buckets: ${GROWTH_BUCKETS.join(", ")}. Use 'all' for every bucket.`
        ),
      n_stock: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Number of companies to return per bucket (1-10)"),
      min_mcap_billion: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(5000)
        .describe("Minimum market cap in billion IDR"),
      sub_sector: z
        .string()
        .optional()
        .default("all")
        .describe(
          "Subsector slug in kebab-case (e.g. 'banks', 'food-beverage'). Use 'all' to skip filtering."
        ),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ classifications, n_stock, min_mcap_billion, sub_sector }) => {
      try {
        const result = await fetchTopGrowth(baseUrl, apiKey, {
          classifications,
          n_stock,
          min_mcap_billion,
          sub_sector,
        });

        return {
          content: [
            {
              type: "text",
              text: `Top Growth Companies (${
                sub_sector !== "all" ? `Subsector: ${sub_sector}` : "All Subsectors"
              })\n\n${formatGrowthResults(result)}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}

function formatGrowthResults(data: TopGrowthResponse): string {
  let output = "";

  const formatCompanyList = (companies: GrowthCompany[]) => {
    return companies
      .map((c) => `• ${c.symbol} (${c.company_name})`)
      .join("\n");
  };

  if (data.top_earnings_growth_gainers?.length > 0) {
    output += `\n📈 Top Earnings Growth Gainers:\n${formatCompanyList(
      data.top_earnings_growth_gainers
    )}\n`;
  }

  if (data.top_earnings_growth_losers?.length > 0) {
    output += `\n📉 Top Earnings Growth Losers:\n${formatCompanyList(
      data.top_earnings_growth_losers
    )}\n`;
  }

  if (data.top_revenue_growth_gainers?.length > 0) {
    output += `\n📈 Top Revenue Growth Gainers:\n${formatCompanyList(
      data.top_revenue_growth_gainers
    )}\n`;
  }

  if (data.top_revenue_growth_losers?.length > 0) {
    output += `\n📉 Top Revenue Growth Losers:\n${formatCompanyList(
      data.top_revenue_growth_losers
    )}\n`;
  }

  return output || "No growth data available for the selected criteria.";
}
