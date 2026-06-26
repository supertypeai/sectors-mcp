import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

interface CompanyMetric {
  symbol: string;
  company_name: string;
}

interface ScreenerEnvelope {
  results: CompanyMetric[];
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

const SUPPORTED_CLASSIFICATIONS = [
  "dividend_yield",
  "total_dividend",
  "revenue",
  "earnings",
  "market_cap",
  "pb",
  "pe",
  "ps",
] as const;

type Classification = (typeof SUPPORTED_CLASSIFICATIONS)[number];

// v2 screener exposes equivalent fields under these names. Most map 1:1; the
// dividend/total_dividend pair maps to TTM aggregates.
const CLASSIFICATION_TO_ORDER_FIELD: Record<Classification, string> = {
  dividend_yield: "yield_ttm",
  total_dividend: "dividend_ttm",
  revenue: "revenue",
  earnings: "earnings",
  market_cap: "market_cap",
  pb: "pb",
  pe: "pe",
  ps: "ps",
};

export interface TopCompaniesResponse {
  classifications: Classification[];
  results: Partial<Record<Classification, CompanyMetric[]>>;
  notes: string[];
}

function parseFilters(
  filters: string | undefined,
  logic: "and" | "or"
): string | null {
  if (!filters) return null;
  const tokens = filters
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.join(` ${logic} `);
}

function buildWhereClause(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p)).join(" and ");
}

export async function fetchTopCompanies(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
    classifications?: string;
    filters?: string;
    logic?: "and" | "or";
    n_stock?: number;
    min_mcap_billion?: number;
    sub_sector?: string;
    year?: number;
  } = {}
): Promise<TopCompaniesResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const {
    classifications = "all",
    filters,
    logic = "and",
    n_stock = 5,
    min_mcap_billion = 5000,
    sub_sector = "all",
    year,
  } = params;

  const requested: Classification[] =
    classifications === "all"
      ? [...SUPPORTED_CLASSIFICATIONS]
      : (classifications
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean) as Classification[]);

  const invalid = requested.filter(
    (c) => !SUPPORTED_CLASSIFICATIONS.includes(c)
  );
  if (invalid.length > 0) {
    throw new Error(
      `Unsupported classifications: ${invalid.join(", ")}. Valid: ${SUPPORTED_CLASSIFICATIONS.join(", ")}`
    );
  }

  const subSectorClause =
    sub_sector && sub_sector !== "all" ? `sub_sector='${sub_sector}'` : null;
  const minMcapClause =
    min_mcap_billion > 0
      ? `market_cap>=${min_mcap_billion * 1_000_000_000}`
      : null;
  const filtersClause = parseFilters(filters, logic);

  const baseWhere = buildWhereClause([
    subSectorClause,
    minMcapClause,
    filtersClause,
  ]);

  const headers = createApiHeaders(apiKey);
  const results: Partial<Record<Classification, CompanyMetric[]>> = {};
  const notes: string[] = [];

  if (year !== undefined) {
    notes.push(
      `Note: 'year' parameter is currently ignored — v2 screener uses TTM/latest values. To rank by a specific year, use order_by=-revenue[${year}] via fetch-companies-by-subindustry or a direct screener call.`
    );
  }
  notes.push(
    "Note: v2 screener returns only {symbol, company_name} per row. Metric values are not included in ranked rows."
  );

  await Promise.all(
    requested.map(async (cls) => {
      const orderField = CLASSIFICATION_TO_ORDER_FIELD[cls];
      const where = buildWhereClause([
        baseWhere || null,
        `${orderField} is not null`,
      ]);
      const queryParams = new URLSearchParams({
        order_by: `-${orderField}`,
        limit: String(n_stock),
      });
      if (where) queryParams.append("where", where);

      const url = `${baseUrl}/companies/?${queryParams.toString()}`;
      const response = await fetch(url, { method: "GET", headers });
      const envelope = await handleApiResponse<ScreenerEnvelope>(response);
      results[cls] = envelope.results;
    })
  );

  return { classifications: requested, results, notes };
}

export function registerTopCompaniesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-top-companies",
    `Fetches top companies ranked by one or more metrics, backed by the v2 screener.

For each requested classification, runs an independent screener query
ordered by that metric and returns up to n_stock companies. Multiple
classifications are fetched in parallel and grouped in the response.

v2 behavior change: ranked rows contain only {symbol, company_name}. The
metric values themselves are not returned per row (the screener does not
support field projection). To inspect a metric value, follow up with
fetch-company-report on the ticker.`,
    {
      classifications: z
        .string()
        .optional()
        .default("all")
        .describe(
          "Comma-separated metrics to rank by. Options: dividend_yield, total_dividend, revenue, earnings, market_cap, pb, pe, ps. Use 'all' for every metric."
        ),
      filters: z
        .string()
        .optional()
        .describe(
          "Comma-separated SQL-style screener predicates (e.g. 'pe>20,revenue>1000000000'). Joined by the logic operator."
        ),
      logic: z
        .enum(["and", "or"])
        .optional()
        .default("and")
        .describe("Logical operator to combine filters (and/or)"),
      n_stock: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Number of stocks to return per classification (1-10)"),
      min_mcap_billion: z
        .number()
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
      year: z
        .number()
        .int()
        .optional()
        .describe(
          "DEPRECATED in v2 — ignored. The v2 screener ranks on TTM/latest values."
        ),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({
      classifications = "all",
      filters,
      logic = "and",
      n_stock = 5,
      min_mcap_billion = 5000,
      sub_sector = "all",
      year,
    }) => {
      try {
        const result = await fetchTopCompanies(baseUrl, apiKey, {
          classifications,
          filters,
          logic,
          n_stock,
          min_mcap_billion,
          sub_sector,
          year,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "An unknown error occurred";

        return {
          content: [
            {
              type: "text" as const,
              text: errorMessage,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
