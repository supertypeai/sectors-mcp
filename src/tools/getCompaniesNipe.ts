import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

export interface CompanyNipeData {
  symbol: string;
  company_name: string;
  employee_num: number | null;
  net_income: number | null;
  nipe: number | null;
  self_financial_info?: any;
}

export async function fetchCompaniesNipe(
  env: any,
  symbols: string[]
): Promise<CompanyNipeData[]> {
  const supabase = createSupabaseClient(env);

  // Query Supabase for company data
  const { data, error } = await supabase
    .from("idx_company_report")
    .select("symbol, company_name, self_financial_info, employee_num")
    .in("symbol", symbols);

  if (error) {
    throw new Error(
      `Failed to fetch NIPE data for symbols: ${symbols.join(", ")} - ${
        error.message
      }`
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Calculate NIPE for each company
  const companiesWithNipe = data.map((company: any) => {
    const employeeNum = company.employee_num;
    const netIncome = company.self_financial_info?.profit_and_loss;

    // Calculate NIPE only if both employee_num and net_income are valid numbers
    let nipe: number | null = null;
    if (
      typeof employeeNum === "number" &&
      employeeNum > 0 &&
      typeof netIncome === "number"
    ) {
      nipe = netIncome / employeeNum;
    }

    return {
      symbol: company.symbol,
      company_name: company.company_name,
      employee_num: employeeNum,
      net_income: netIncome,
      nipe: nipe,
      self_financial_info: company.self_financial_info,
    };
  });

  return companiesWithNipe as CompanyNipeData[];
}

export function registerCompaniesNipeTool(server: McpServer, env: any) {
  server.tool(
    "get-companies-nipe",
    `Get Net Income Per Employee (NIPE) for multiple IDX companies.
    
    This tool calculates NIPE by dividing the company's net income (profit_and_loss from self_financial_info) 
    by the number of employees (employee_num). 
    
    NIPE is a productivity metric that shows how much profit each employee generates on average.
    Higher NIPE values may indicate higher efficiency or capital-intensive operations.
    
    Returns:
    - symbol: Company stock symbol
    - company_name: Company name
    - employee_num: Number of employees
    - net_income: Net income/profit (from self_financial_info.profit_and_loss)
    - nipe: Net Income Per Employee (calculated)
    - self_financial_info: Full financial information object
    
    Note: NIPE will be null if employee_num is zero, null, or if net_income is not available.`,
    {
      symbols: z
        .array(z.string())
        .describe("Array of company symbols to calculate NIPE for"),
    },
    async ({ symbols }) => {
      try {
        const companies = await fetchCompaniesNipe(env, symbols);

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
              text: `Error fetching companies NIPE: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
