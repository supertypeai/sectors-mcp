import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSgxCompaniesBySector(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  where?: string;
  q?: string;
  order_by?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
  include_query_values?: boolean;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/sgx/companies/`);
  if (params.where !== undefined) {
    url.searchParams.append("where", String(params.where));
  }
  if (params.q !== undefined) {
    url.searchParams.append("q", String(params.q));
  }
  if (params.order_by !== undefined) {
    url.searchParams.append("order_by", String(params.order_by));
  }
  if (params.desc !== undefined) {
    url.searchParams.append("desc", String(params.desc));
  }
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.append("offset", String(params.offset));
  }
  if (params.include_query_values !== undefined) {
    url.searchParams.append("include_query_values", String(params.include_query_values));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSgxCompaniesBySectorTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-companies-by-sector",
    "High-performance API for filtering and sorting SGX-listed companies. Supports both structured SQL-like queries (`where`, `order_by`) and natural language queries (`q`). Returns a paginated list of companies.\n\n**Query modes** (mutually exclusive — `q` overrides all others):\n- `q`: Natural language, e.g. `top 5 SGX banks by market cap`\n- `where` + `order_by`: SQL-like structured query\n\n<Note>SGX symbol: 3 characters (letters or digits). E.g. `D05`, `U11`, `Z74`. No suffix.</Note>\n\n<Note>SGX sector column contains duplicate variants (e.g. `Consumer Cyclical` / `Consumer Cyclicals`, `Financial Services` / `Financials`, `Real Estate` / `Properties & Real Estate` / `REIT`) pending upstream cleanup. To capture all matching companies, query with `OR` (e.g. `sector = 'Real Estate' OR sector = 'Properties & Real Estate' OR sector = 'REIT'`).</Note>\n\n<Accordion title=\"Smart FY Handling\">\nTo account for reporting lags, 'latest year' queries made between January and April default to the previous audited year (e.g. a query in early 2026 uses 2024 data).\n</Accordion>\n\n<Accordion title=\"Syntax and Operators\">\n**Operators:** `=`, `!=`, `>`, `>=`, `<`, `<=`, `like`, `in`\n\n**Logic:** combine conditions with `and` and `or`\n\n**String values:** use single or double quotes — `sector = 'Technology'`\n\n**Lists (for `in`):** `tags in ['blue-chip', 'dividend']`\n</Accordion>\n\n<Accordion title=\"Yearly Data\">\nAccess historical data using bracket notation: `field[YYYY]`\n\nExamples: `revenue[2023] > 1000000000` or `total_yield[2024] > 0.05`\n\n**Note:** SGX data is annual only — there is no quarterly data.\n</Accordion>\n\n<Accordion title=\"Arithmetic Expressions\">\nPerform calculations within your query on both sides of a condition.\n\nExamples: `earnings[2024] > earnings[2023] * 1.25` or `revenue[2024] / revenue[2023] > 1.5`\n</Accordion>\n\n<Accordion title=\"SGX-Specific Limitations\">\nSome IDX screener features are **not available** for SGX due to data scope:\n\n- **No person / entity ownership queries** — no `executives`, `major_shareholders`, or `affiliates` fields.\n- **No peer averages** — no `pe_peer_avg`, `pb_peer_avg`, etc.\n- **No `free_float` field**.\n- **No quarterly data** — only annual fields like `revenue[2024]`.\n- **Coverage caveats**: yearly fields marked `[Big caps only]` are populated only for ~22 large-caps; fields marked `[Banks only]` are populated only for DBS / OCBC / UOB.\n</Accordion>\n\n<Accordion title=\"Available Fields\">\n<AccordionGroup>\n\n<Accordion title=\"Direct Fields (Top-level columns)\">\n**How to Use:** Query these fields directly using standard operators (`=`, `!=`, `>`, `<`, `LIKE`, `IN`). String comparisons are case-insensitive.\n\n<Accordion title=\"Examples\">\n- `where=market_cap > 500000000000000`\n- `where=company_name like '%energi%'`\n- `where=sector = 'Financials' and listing_date > '2005-01-01'`\n</Accordion>\n\n- **symbol**: SGX ticker symbol (3 characters, e.g. `D05`, `U11`, `Z74`)\n- **company_name**: Full registered company name\n- **sector**: SGX sector classification. NB: source data contains duplicate labels (e.g. `Consumer Cyclical` vs `Consumer Cyclicals`, `Financial Services` vs `Financials`) — pending upstream cleanup.\n- **sub_sector**: SGX sub-sector classification (126 distinct values)\n- **market_cap**: Market capitalisation in SGD\n- **volume**: Recent average daily trading volume (shares)\n- **last_close_price**: Most recent close price in SGD\n- **employee_num**: Total number of employees\n- **pe**: Price-to-earnings ratio\n- **eps**: Earnings per share (SGD)\n- **beta**: Beta vs SGX market\n- **ps**: Price-to-sales ratio\n- **pcf**: Price-to-cash-flow ratio\n- **pb**: Price-to-book ratio\n- **gross_margin**: Gross profit margin (decimal, e.g. 0.45 = 45%)\n- **operating_margin**: Operating profit margin (decimal)\n- **net_profit_margin**: Net profit margin (decimal)\n- **quick_ratio**: Quick ratio (acid test)\n- **current_ratio**: Current ratio\n- **debt_to_equity**: Debt-to-equity ratio\n- **one_year_eps_growth**: 1-year EPS growth (decimal)\n- **one_year_sales_growth**: 1-year sales (revenue) growth (decimal)\n- **forward_dividend**: Forward annual dividend per share in SGD\n- **forward_dividend_yield**: Forward annual dividend yield (decimal)\n- **dividend_ttm**: Trailing-twelve-month dividend per share in SGD\n- **dividend_yield_5y_avg**: 5-year average dividend yield (decimal)\n- **dividend_growth_rate**: Year-over-year dividend growth rate (decimal)\n- **payout_ratio**: Dividend payout ratio (decimal)\n- **change_1d**: 1-day price change (decimal)\n- **change_7d**: 7-day price change (decimal)\n- **change_1m**: 1-month price change (decimal)\n- **change_ytd**: Year-to-date price change (decimal)\n- **change_1y**: 1-year price change (decimal)\n- **change_3y**: 3-year price change (decimal)\n</Accordion>\n\n<Accordion title=\"Array Fields\">\n**How to Use:** Query using the `in` operator to check if any of the provided values exist in the array.\n\n<Accordion title=\"Examples\">\n- `where=indices in ['LQ45', 'IDX30']`\n- `where=tags in ['52-w-high', 'public-float-under-25']`\n</Accordion>\n\n- **tags**: Analyst sentiment / classification tags\n</Accordion>\n\n<Accordion title=\"JSON Object Fields (Most Recent Data)\">\n**How to Use:** Query as if they were direct fields — the parser automatically extracts the value from the underlying JSON.\n\n<Accordion title=\"Examples\">\n- `where=pe_ttm < 15 and roe_ttm > 0.1`\n- `where=last_close_price < all_time_high_price`\n- `where=ytd_low_date > '2025-03-01'`\n</Accordion>\n\n- **ytd_low_price**: Year-to-date lowest closing price in SGD\n- **ytd_low_date**: Date of the year-to-date lowest closing price\n- **ytd_high_price**: Year-to-date highest closing price in SGD\n- **ytd_high_date**: Date of the year-to-date highest closing price\n- **52_w_low_price**: 52-week lowest closing price in SGD\n- **52_w_low_date**: Date of the 52-week lowest closing price\n- **52_w_high_price**: 52-week highest closing price in SGD\n- **52_w_high_date**: Date of the 52-week highest closing price\n- **90_d_low_price**: 90-day lowest closing price in SGD\n- **90_d_low_date**: Date of the 90-day lowest closing price\n- **90_d_high_price**: 90-day highest closing price in SGD\n- **90_d_high_date**: Date of the 90-day highest closing price\n- **all_time_low_price**: All-time lowest closing price in SGD\n- **all_time_low_date**: Date of the all-time lowest closing price\n- **all_time_high_price**: All-time highest closing price in SGD\n- **all_time_high_date**: Date of the all-time highest closing price\n</Accordion>\n\n<Accordion title=\"Yearly JSON Fields (Historical & Forecast Data)\">\n**How to Use:** Must use bracket notation `field[YYYY]` to access data for a specific year. Supports all numeric operators, field-to-field comparisons, and arithmetic expressions.\n\n<Accordion title=\"Examples\">\n- `where=revenue[2023] > earnings[2023] * 5`\n- `where=roe[2023] > 0.15 and roe[2022] > 0.15`\n- `where=pe[2024] < pe_peer_avg[2024]`\n</Accordion>\n\n- **revenue**: Annual revenue in SGD. Use: `revenue[2024]`.\n- **earnings**: Annual net profit/loss in SGD. Use: `earnings[2024]`.\n- **total_dividend**: Total dividends paid per share for the year (SGD). Use: `total_dividend[2024]`.\n- **total_yield**: Total dividend yield for the year (decimal). Use: `total_yield[2024]`.\n- **operating_cash_flow**: Operating cash flow in SGD. Use: `operating_cash_flow[2024]`. _(coverage: Big caps only)_\n- **investing_cash_flow**: Investing cash flow in SGD. Use: `investing_cash_flow[2024]`. _(coverage: Big caps only)_\n- **financing_cash_flow**: Financing cash flow in SGD. Use: `financing_cash_flow[2024]`. _(coverage: Big caps only)_\n- **free_cash_flow**: Free cash flow in SGD. Use: `free_cash_flow[2024]`. _(coverage: Big caps only)_\n- **net_cash_flow**: Net cash flow in SGD. Use: `net_cash_flow[2024]`. _(coverage: Big caps only)_\n- **capital_expenditure**: Capital expenditure in SGD. Use: `capital_expenditure[2024]`. _(coverage: Big caps only)_\n- **ebit**: EBIT (earnings before interest and tax) in SGD. Use: `ebit[2024]`. _(coverage: Big caps only)_\n- **ebitda**: EBITDA in SGD. Use: `ebitda[2024]`. _(coverage: Big caps only)_\n- **gross_income**: Gross income in SGD. Use: `gross_income[2024]`. _(coverage: Big caps only)_\n- **cost_of_revenue**: Cost of revenue in SGD. Use: `cost_of_revenue[2024]`. _(coverage: Big caps only)_\n- **operating_income**: Operating income in SGD. Use: `operating_income[2024]`. _(coverage: Big caps only)_\n- **operating_expense**: Operating expense in SGD. Use: `operating_expense[2024]`. _(coverage: Big caps only)_\n- **pretax_income**: Pre-tax income in SGD. Use: `pretax_income[2024]`. _(coverage: Big caps only)_\n- **income_taxes**: Income taxes paid in SGD. Use: `income_taxes[2024]`. _(coverage: Big caps only)_\n- **total_asset**: Total assets in SGD. Use: `total_asset[2024]`. _(coverage: Big caps only)_\n- **total_equity**: Total equity in SGD. Use: `total_equity[2024]`. _(coverage: Big caps only)_\n- **total_liabilities**: Total liabilities in SGD. Use: `total_liabilities[2024]`. _(coverage: Big caps only)_\n- **working_capital**: Working capital in SGD. Use: `working_capital[2024]`. _(coverage: Big caps only)_\n- **total_current_asset**: Total current assets in SGD. Use: `total_current_asset[2024]`. _(coverage: Big caps only)_\n- **total_non_current_asset**: Total non-current assets in SGD. Use: `total_non_current_asset[2024]`. _(coverage: Big caps only)_\n- **net_interest_income**: Net interest income in SGD. Use: `net_interest_income[2024]`. _(coverage: Banks only)_\n- **interest_income**: Total interest income in SGD. Use: `interest_income[2024]`. _(coverage: Banks only)_\n- **interest_expense**: Total interest expense in SGD. Use: `interest_expense[2024]`. _(coverage: Banks only)_\n- **net_fee_and_commission_income**: Net fee and commission income in SGD. Use: `net_fee_and_commission_income[2024]`. _(coverage: Banks only)_\n- **net_trading_income**: Net trading income in SGD. Use: `net_trading_income[2024]`. _(coverage: Banks only)_\n- **net_loan**: Net loans outstanding in SGD. Use: `net_loan[2024]`. _(coverage: Banks only)_\n- **gross_loan**: Gross loans outstanding in SGD. Use: `gross_loan[2024]`. _(coverage: Banks only)_\n- **total_deposit**: Total customer deposits in SGD. Use: `total_deposit[2024]`. _(coverage: Banks only)_\n- **core_capital_tier1**: Core capital (Tier 1) in SGD. Use: `core_capital_tier1[2024]`. _(coverage: Banks only)_\n- **total_risk_weighted_asset**: Total risk-weighted assets in SGD. Use: `total_risk_weighted_asset[2024]`. _(coverage: Banks only)_\n</Accordion>\n\n<Accordion title=\"Quarterly Financial Data\">\n**How to Use:** Must use bracket notation `field[Qi-YYYY]` to access data for a specific quarter.\n\n<Accordion title=\"Examples\">\n- `where=revenue_q[Q1-2024] > 1000000000`\n- `where=earnings_q[Q4-2023] > earnings_q[Q3-2023]`\n</Accordion>\n\n\n</Accordion>\n\n<Accordion title=\"JSON List Fields\">\n**How to Use:** The query checks if **any** object in the list matches the condition. Use `=` or `like` for strings, numeric operators for numbers.\n\n<Accordion title=\"Examples\">\n- `where=major_shareholders_name like 'PT%' and major_shareholders_share_percentage > 0.1`\n- `where=key_executives_name = 'Prajogo Pangestu'`\n</Accordion>\n\n\n</Accordion>\n\n</AccordionGroup>\n</Accordion>\n\n<Info>Costs 1 API credit for structured queries. Using the natural-language `?q=` parameter costs 3 API credits.</Info>",
    {
      where: z.string()
        .describe("SQL-like conditions for advanced filtering. Ignored if `q` is present. Supports operators `=`, `!=`, `>`, `>=`, `<`, `<=`, `like`, `in` combined with `and`/`or`. Use bracket notation for yearly fields: `revenue[2024] > 1000000000`. Supports arithmetic on both sides: `earnings[2024] / earnings[2023] > 1.25`.").optional(),
      q: z.string()
        .describe("A natural language query (e.g. `top 5 SGX banks by market cap`). When `q` is provided, all other query parameters (`where`, `order_by`, etc.) are ignored as the LLM will generate them.").optional(),
      order_by: z.string()
        .describe("Field to sort results by. Use `-` prefix for descending order (e.g. `-market_cap`). Supports arithmetic expressions (e.g. `-(earnings[2024]/earnings[2023])`). Ignored if `q` is present.").optional(),
      desc: z.boolean()
        .describe("Sort in descending order. Ignored if `q` is present.").optional(),
      limit: z.number()
        .describe("Maximum number of results to return. Max: 200. Ignored if `q` is present.").optional(),
      offset: z.number()
        .describe("Number of results to skip for pagination. Ignored if `q` is present.").optional(),
      include_query_values: z.boolean()
        .describe("If `true`, the response includes a `query_values` object showing the field values used in filtering/sorting.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchSgxCompaniesBySector(baseUrl, apiKey, params);
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
