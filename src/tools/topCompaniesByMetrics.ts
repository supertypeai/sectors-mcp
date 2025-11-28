import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";
import { extractLatestEps, type HistoricalEps } from "./getCompaniesReport.js";

export interface TopCompanyData {
  symbol: string;
  company_name: string;
  sector?: string;
  sub_sector?: string;
  market_cap?: number;
  dividend_ttm?: number;
  cash_payout_ratio?: number;
  historical_eps?: HistoricalEps | null;
  employee_num?: number;
  last_close_price?: number;
  eps?: number | null;
  [key: string]: any;
}

export async function fetchTopCompaniesByMetrics(
  env: any,
  metric: string,
  limit?: number,
  subsector?: string
): Promise<TopCompanyData[]> {
  const supabase = createSupabaseClient(env);

  // Always include these columns along with the requested metric
  const columns = [
    "symbol",
    "company_name",
    "sector",
    "sub_sector",
    "market_cap",
    "dividend_ttm",
    "cash_payout_ratio",
    "historical_eps",
    "employee_num",
    "last_close_price",
  ];

  const isEpsMetric = metric === "eps" || metric === "historical_eps";
  const metricColumn = isEpsMetric ? "historical_eps" : metric;

  // Create query builder
  let query = supabase
    .from("idx_company_report")
    .select(columns.join(","))
    .not(metricColumn, "is", null);

  // Add subsector filter if provided
  if (subsector) {
    query = query.eq("sub_sector", subsector);
  }

  if (isEpsMetric) {
    const { data, error } = await query;
    if (error) {
      throw new Error(
        `Failed to fetch top companies by eps${
          subsector ? ` in subsector ${subsector}` : ""
        } - ${error.message}`
      );
    }

    if (!data || data.length === 0) {
      return [];
    }

    let finalData = ((data as unknown as TopCompanyData[]) || []).map(
      (row) => ({
        ...row,
        eps: extractLatestEps(row.historical_eps ?? null),
      })
    );

    // sort by eps desc (nulls last)
    finalData.sort((a, b) => {
      const ae = typeof a.eps === "number" ? a.eps : Number.NEGATIVE_INFINITY;
      const be = typeof b.eps === "number" ? b.eps : Number.NEGATIVE_INFINITY;
      return be - ae;
    });

    return finalData.slice(0, limit || 10);
  } else {
    const { data, error } = await query
      .order(metricColumn, { ascending: false })
      .limit(limit || 10);

    if (error) {
      throw new Error(
        `Failed to fetch top companies by ${metric}${
          subsector ? ` in subsector ${subsector}` : ""
        } - ${error.message}`
      );
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data as unknown as TopCompanyData[];
  }
}

export function registerTopCompaniesByMetricsTool(server: McpServer, env: any) {
  server.tool(
    "get-top-companies-by-metrics",
    `Get top companies ranked by a specific metric.
    Available metrics:
    - market_cap: Market capitalization
    - dividend_ttm: Trailing twelve months dividend
    - cash_payout_ratio: Cash payout ratio
    - employee_num: Number of employees
    - eps: Latest earnings per share (extracted from historical_eps)
    - historical_eps: Historical EPS data`,
    {
      metric: z
        .enum([
          "market_cap",
          "dividend_ttm",
          "cash_payout_ratio",
          "eps",
          "historical_eps",
          "employee_num",
        ])
        .describe("The metric to rank companies by"),
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
        const companies = await fetchTopCompaniesByMetrics(
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
              text: `Error fetching top companies: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
