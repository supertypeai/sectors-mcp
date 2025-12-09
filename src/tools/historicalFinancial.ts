import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient";

export interface YearlyFinancialData {
  symbol: string;
  year: number;

  // Income Statement
  revenue: number | null;
  earnings: number | null;
  tax: number | null;
  ebit: number | null;
  ebitda: number | null;
  gross_profit: number | null;
  cost_of_revenue: number | null;
  operating_pnl: number | null;
  operating_expense: number | null;
  earnings_before_tax: number | null;
  provision: number | null;

  // Interest Income/Expense
  interest_income: number | null;
  interest_expense: number | null;
  net_interest_income: number | null;
  interest_expense_non_operating: number | null;

  // Non-Interest Income
  non_interest_income: number | null;
  non_operating_income_or_loss: number | null;

  // Premium (Insurance)
  premium_income: number | null;
  premium_expense: number | null;
  net_premium_income: number | null;

  // Assets
  total_assets: number | null;
  fixed_assets: number | null;
  prepaid_assets: number | null;
  current_liabilities: number | null;

  // Cash & Cash Flow
  cash_only: number | null;
  cash_and_equivalents: number | null;
  total_cash_and_due_from_banks: number | null;
  end_cash_position: number | null;
  cash_inflow: number | null;
  cash_outflow: number | null;
  net_cash_flow: number | null;
  operating_cash_flow: number | null;
  investing_cash_flow: number | null;
  financing_cash_flow: number | null;
  free_cash_flow: number | null;

  // Loans
  gross_loan: number | null;
  net_loan: number | null;
  allowance_for_loans: number | null;
  non_loan_assets: number | null;
  non_loan_earning_assets: number | null;
  non_loan_non_earning_assets: number | null;

  // Deposits
  total_deposit: number | null;
  current_account: number | null;
  savings_account: number | null;
  time_deposit: number | null;

  // Debt & Equity
  total_debt: number | null;
  total_equity: number | null;
  total_liabilities: number | null;
  retained_earnings: number | null;
  non_interest_bearing_liabilities: number | null;
  other_interest_bearing_liabilities: number | null;

  // Capital & RWA
  total_capital: number | null;
  total_risk_weighted_asset: number | null;
  credit_rwa: number | null;
  market_rwa: number | null;
  operational_rwa: number | null;
  core_capital_tier1: number | null;
  supplementary_capital_tier2: number | null;

  // Other Financial Metrics
  high_quality_liquid_asset: number | null;
  outstanding_shares: number | null;
  realized_capital_goods_investment: number | null;

  // Industry Breakdown (complex nested structure)
  industry_breakdown: {
    loan_at_risk?: {
      "Special Mention Loan"?: number;
      "Non-performing Loan (NPL)"?: number;
      "Restructured Loan (current)"?: number;
    };
    non_loan_asset?: Array<{
      class: string;
      amount: number;
      category: string;
    }>;
    loan_by_economic_sectors?: Array<{
      key: string;
      group: string;
      value: number;
    }>;
  } | null;
}

// Define all available field keys
export const AVAILABLE_FINANCIAL_FIELDS = [
  // Always included
  'symbol', 'year',
  // Income Statement
  'revenue', 'earnings', 'tax', 'ebit', 'ebitda', 'gross_profit', 'cost_of_revenue',
  'operating_pnl', 'operating_expense', 'earnings_before_tax', 'provision',
  // Interest Income/Expense
  'interest_income', 'interest_expense', 'net_interest_income', 'interest_expense_non_operating',
  // Non-Interest Income
  'non_interest_income', 'non_operating_income_or_loss',
  // Premium (Insurance)
  'premium_income', 'premium_expense', 'net_premium_income',
  // Assets
  'total_assets', 'fixed_assets', 'prepaid_assets', 'current_liabilities',
  // Cash & Cash Flow
  'cash_only', 'cash_and_equivalents', 'total_cash_and_due_from_banks', 'end_cash_position',
  'cash_inflow', 'cash_outflow', 'net_cash_flow', 'operating_cash_flow',
  'investing_cash_flow', 'financing_cash_flow', 'free_cash_flow',
  // Loans
  'gross_loan', 'net_loan', 'allowance_for_loans', 'non_loan_assets',
  'non_loan_earning_assets', 'non_loan_non_earning_assets',
  // Deposits
  'total_deposit', 'current_account', 'savings_account', 'time_deposit',
  // Debt & Equity
  'total_debt', 'total_equity', 'total_liabilities', 'retained_earnings',
  'non_interest_bearing_liabilities', 'other_interest_bearing_liabilities',
  // Capital & RWA
  'total_capital', 'total_risk_weighted_asset', 'credit_rwa', 'market_rwa',
  'operational_rwa', 'core_capital_tier1', 'supplementary_capital_tier2',
  // Other Financial Metrics
  'high_quality_liquid_asset', 'outstanding_shares', 'realized_capital_goods_investment',
  // Industry Breakdown
  'industry_breakdown'
] as const;

export type FinancialField = typeof AVAILABLE_FINANCIAL_FIELDS[number];

export async function fetchHistoricalFinancialData(
  symbol: string,
  env: any,
  requestedFields?: string[]
): Promise<YearlyFinancialData[] | Array<Record<string, any>>> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase
    .from("idx_company_report")
    .select("historical_financials")
    .eq("symbol", symbol)
    .single();

  if (error) {
    throw new Error(`Failed to fetch historical financial data for company: ${symbol}. Error: ${error.message}`);
  }

  if (!data?.historical_financials || !Array.isArray(data.historical_financials)) {
    throw new Error(`No historical financial data found for company: ${symbol}`);
  }

  // Cast to array of records with any fields
  const typedData = data.historical_financials as Array<Record<string, any>>;

  // If specific fields are requested, filter to those fields only
  if (requestedFields && requestedFields.length > 0) {
    // Always include symbol and year
    const filteredData = typedData.map((yearData) => {
      const result: Record<string, any> = {
        symbol: symbol,
        year: yearData.year,
      };

      // Add only requested fields
      requestedFields.forEach(field => {
        if (field !== 'symbol' && field !== 'year') {
          result[field] = yearData[field] ?? null;
        }
      });

      return result;
    });

    return filteredData;
  }

  // Otherwise, return all available financial fields
  const filteredData: YearlyFinancialData[] = typedData.map((yearData) => ({
    symbol: symbol,
    year: yearData.year,

    // Income Statement
    revenue: yearData.revenue ?? null,
    earnings: yearData.earnings ?? null,
    tax: yearData.tax ?? null,
    ebit: yearData.ebit ?? null,
    ebitda: yearData.ebitda ?? null,
    gross_profit: yearData.gross_profit ?? null,
    cost_of_revenue: yearData.cost_of_revenue ?? null,
    operating_pnl: yearData.operating_pnl ?? null,
    operating_expense: yearData.operating_expense ?? null,
    earnings_before_tax: yearData.earnings_before_tax ?? null,
    provision: yearData.provision ?? null,

    // Interest Income/Expense
    interest_income: yearData.interest_income ?? null,
    interest_expense: yearData.interest_expense ?? null,
    net_interest_income: yearData.net_interest_income ?? null,
    interest_expense_non_operating: yearData.interest_expense_non_operating ?? null,

    // Non-Interest Income
    non_interest_income: yearData.non_interest_income ?? null,
    non_operating_income_or_loss: yearData.non_operating_income_or_loss ?? null,

    // Premium (Insurance)
    premium_income: yearData.premium_income ?? null,
    premium_expense: yearData.premium_expense ?? null,
    net_premium_income: yearData.net_premium_income ?? null,

    // Assets
    total_assets: yearData.total_assets ?? null,
    fixed_assets: yearData.fixed_assets ?? null,
    prepaid_assets: yearData.prepaid_assets ?? null,
    current_liabilities: yearData.current_liabilities ?? null,

    // Cash & Cash Flow
    cash_only: yearData.cash_only ?? null,
    cash_and_equivalents: yearData.cash_and_equivalents ?? null,
    total_cash_and_due_from_banks: yearData.total_cash_and_due_from_banks ?? null,
    end_cash_position: yearData.end_cash_position ?? null,
    cash_inflow: yearData.cash_inflow ?? null,
    cash_outflow: yearData.cash_outflow ?? null,
    net_cash_flow: yearData.net_cash_flow ?? null,
    operating_cash_flow: yearData.operating_cash_flow ?? null,
    investing_cash_flow: yearData.investing_cash_flow ?? null,
    financing_cash_flow: yearData.financing_cash_flow ?? null,
    free_cash_flow: yearData.free_cash_flow ?? null,

    // Loans
    gross_loan: yearData.gross_loan ?? null,
    net_loan: yearData.net_loan ?? null,
    allowance_for_loans: yearData.allowance_for_loans ?? null,
    non_loan_assets: yearData.non_loan_assets ?? null,
    non_loan_earning_assets: yearData.non_loan_earning_assets ?? null,
    non_loan_non_earning_assets: yearData.non_loan_non_earning_assets ?? null,

    // Deposits
    total_deposit: yearData.total_deposit ?? null,
    current_account: yearData.current_account ?? null,
    savings_account: yearData.savings_account ?? null,
    time_deposit: yearData.time_deposit ?? null,

    // Debt & Equity
    total_debt: yearData.total_debt ?? null,
    total_equity: yearData.total_equity ?? null,
    total_liabilities: yearData.total_liabilities ?? null,
    retained_earnings: yearData.retained_earnings ?? null,
    non_interest_bearing_liabilities: yearData.non_interest_bearing_liabilities ?? null,
    other_interest_bearing_liabilities: yearData.other_interest_bearing_liabilities ?? null,

    // Capital & RWA
    total_capital: yearData.total_capital ?? null,
    total_risk_weighted_asset: yearData.total_risk_weighted_asset ?? null,
    credit_rwa: yearData.credit_rwa ?? null,
    market_rwa: yearData.market_rwa ?? null,
    operational_rwa: yearData.operational_rwa ?? null,
    core_capital_tier1: yearData.core_capital_tier1 ?? null,
    supplementary_capital_tier2: yearData.supplementary_capital_tier2 ?? null,

    // Other Financial Metrics
    high_quality_liquid_asset: yearData.high_quality_liquid_asset ?? null,
    outstanding_shares: yearData.outstanding_shares ?? null,
    realized_capital_goods_investment: yearData.realized_capital_goods_investment ?? null,

    // Industry Breakdown
    industry_breakdown: yearData.industry_breakdown ?? null,
  }));

  return filteredData;
}

export function registerHistoricalFinancialTool(server: McpServer, env: any) {
  server.tool(
    "get-companies-historical-financial",
    `Get comprehensive historical financial information for a specific IDX (Indonesia Stock Exchange) company.
    
    AVAILABLE FIELDS (all fields are optional - if not specified, all fields will be returned):
    
    Income Statement Fields:
    - revenue, earnings, tax, ebit, ebitda, gross_profit, cost_of_revenue
    - operating_pnl, operating_expense, earnings_before_tax, provision
    
    Interest Income/Expense Fields:
    - interest_income, interest_expense, net_interest_income, interest_expense_non_operating
    
    Non-Interest Income Fields:
    - non_interest_income, non_operating_income_or_loss
    
    Premium (Insurance) Fields:
    - premium_income, premium_expense, net_premium_income
    
    Asset Fields:
    - total_assets, fixed_assets, prepaid_assets, current_liabilities
    
    Cash & Cash Flow Fields:
    - cash_only, cash_and_equivalents, total_cash_and_due_from_banks, end_cash_position
    - cash_inflow, cash_outflow, net_cash_flow, operating_cash_flow
    - investing_cash_flow, financing_cash_flow, free_cash_flow
    
    Loan Fields:
    - gross_loan, net_loan, allowance_for_loans, non_loan_assets
    - non_loan_earning_assets, non_loan_non_earning_assets
    
    Deposit Fields:
    - total_deposit, current_account, savings_account, time_deposit
    
    Debt & Equity Fields:
    - total_debt, total_equity, total_liabilities, retained_earnings
    - non_interest_bearing_liabilities, other_interest_bearing_liabilities
    
    Capital & RWA Fields:
    - total_capital, total_risk_weighted_asset, credit_rwa, market_rwa
    - operational_rwa, core_capital_tier1, supplementary_capital_tier2
    
    Other Financial Metrics:
    - high_quality_liquid_asset, outstanding_shares, realized_capital_goods_investment
    - industry_breakdown (complex nested structure with loan classifications and sector breakdowns)
    
    USAGE:
    - Specify 'fields' parameter with an array of field names to retrieve only those fields
    - If 'fields' is not specified or empty, all available fields will be returned
    - 'symbol' and 'year' are always included in the response
    
    Data is provided on a yearly basis with historical records.
    Note: The company symbol must include the .JK suffix (e.g., 'BBCA.JK')`,
    {
      symbol: z.string().regex(/\.JK$/, "Symbol must end with .JK"),
      fields: z.array(z.string()).optional().describe(
        `Optional array of field names to retrieve. Available fields: ${AVAILABLE_FINANCIAL_FIELDS.filter(f => f !== 'symbol' && f !== 'year').join(', ')}. If not specified, all fields will be returned.`
      ),
    },
    async (args: { symbol: string; fields?: string[] }) => {
      try {
        const data = await fetchHistoricalFinancialData(args.symbol, env, args.fields);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching historical financial data: ${error instanceof Error ? error.message : String(error)
                }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
