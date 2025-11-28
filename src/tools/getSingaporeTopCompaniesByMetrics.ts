import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

export interface SingaporeTopCompanyData {
  symbol: string;
  name: string;
  sector?: string;
  sub_sector?: string;
  market_cap?: number;
  volume?: number;
  pe?: number;
  pb?: number;
  ps?: number;
  pcf?: number;
  dividend_ttm?: number;
  dividend_yield_5y_avg?: number;
  forward_dividend_yield?: number;
  payout_ratio?: number;
  eps?: number;
  revenue?: number;
  operating_margin?: number;
  net_profit_margin?: number;
  employee_num?: number;
  [key: string]: any;
}

export async function fetchSingaporeTopCompaniesByMetrics(
  env: any,
  metric: string,
  limit?: number,
  subsector?: string
): Promise<SingaporeTopCompanyData[]> {
  const supabase = createSupabaseClient(env);

  // Create query builder
  let query = supabase
    .from("sgx_company_report")
    .select(
      "symbol, name, sector, sub_sector, market_cap, volume, pe, pb, ps, pcf, dividend_ttm, dividend_yield_5y_avg, forward_dividend_yield, payout_ratio, eps, revenue, operating_margin, net_profit_margin, employee_num"
    )
    .not(metric, "is", null);

  // Add subsector filter if provided
  if (subsector) {
    query = query.eq("sub_sector", subsector);
  }

  // Complete the query with ordering and limit
  const { data, error } = await query
    .order(metric, { ascending: false })
    .limit(limit || 10);

  if (error) {
    throw new Error(
      `Failed to fetch top Singapore companies by ${metric}${
        subsector ? ` in subsector ${subsector}` : ""
      } - ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Format the data to ensure consistent naming
  const formattedData = data.map((company) => ({
    symbol: company.symbol,
    name: company.name,
    sector: company.sector,
    sub_sector: company.sub_sector,
    market_cap: company.market_cap,
    volume: company.volume,
    [metric]: company[metric as keyof typeof company],
  }));

  return formattedData as unknown as SingaporeTopCompanyData[];
}

export function registerSingaporeTopCompaniesByMetricsTool(
  server: McpServer,
  env: any
) {
  server.tool(
    "get-singapore-top-companies-by-metrics",
    `Get top SGX (Singapore Exchange) companies ranked by a specific metric.
    Available metrics:
    - market_cap: Market capitalization
    - pe: Price-to-earnings ratio
    - pb: Price-to-book ratio
    - ps: Price-to-sales ratio
    - pcf: Price-to-cash-flow ratio
    - dividend_ttm: Trailing twelve months dividend
    - dividend_yield_5y_avg: 5-year average dividend yield
    - forward_dividend_yield: Forward dividend yield
    - payout_ratio: Dividend payout ratio
    - eps: Earnings per share
    - revenue: Trailing twelve months revenue
    - operating_margin: Operating profit margin
    - net_profit_margin: Net profit margin
    - employee_num: Number of employees`,
    {
      metric: z
        .enum([
          "market_cap",
          "pe",
          "pb",
          "ps",
          "pcf",
          "dividend_ttm",
          "dividend_yield_5y_avg",
          "forward_dividend_yield",
          "payout_ratio",
          "eps",
          "revenue",
          "operating_margin",
          "net_profit_margin",
          "employee_num",
        ])
        .describe("The metric to rank Singapore companies by"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Number of top companies to return. Defaults to 10."),
      subsector: z
        .string()
        .optional()
        .describe("Optional subsector filter to narrow results"),
    },
    async ({ metric, limit, subsector }) => {
      try {
        const companies = await fetchSingaporeTopCompaniesByMetrics(
          env,
          metric,
          limit,
          subsector
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(companies, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching top Singapore companies: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
