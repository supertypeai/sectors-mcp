import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SECTORS_API_BASE } from "../config.js";

// Import auto-generated REST tools (64 tools from schema.json)
import * as GeneratedTools from "./generated/index.js";

// Import Supabase-backed tools (out of scope for v2 REST parity)
import { registerIPOCompaniesTool } from "./getIpoCompanies.js";
import { registerHistoricalFinancialTool } from "./historicalFinancial.js";
import { registerCompaniesReportTool } from "./getCompaniesReport.js";
import { registerDailyTransactionTool } from "./getDailyTransaction.js";
import { registerCompanyDividendTool } from "./getCompanyDividend.js";
import { registerCompanyFinancialTool } from "./getCompanyFinancial.js";
import { registerSubsectorReportTool } from "./subsectorReport.js";
import { registerTopCompaniesByMetricsTool } from "./topCompaniesByMetrics.js";
import { registerSingaporeCompanyHistoricalFinancialTool } from "./getSingaporeCompanyHistoricalFinancial.js";
import { registerSingaporeCompaniesReportTool } from "./getSingaporeCompaniesReport.js";
import { registerSingaporeDailyTransactionTool } from "./getSingaporeDailyTransaction.js";
import { registerSingaporeCompanyDividendTool } from "./getSingaporeCompanyDividend.js";
import { registerSingaporeTopCompaniesByMetricsTool } from "./getSingaporeTopCompaniesByMetrics.js";
import { registerSingaporeEarningsYieldTool, registerSingaporeHistoricalVolatilityTool } from "./getSingaporeAdvancedMetrics.js";
import { registerCompaniesNipeTool } from "./getCompaniesNipe.js";

export function registerAllTools(server: McpServer, apiKey: string, env?: any) {
  // Two backends:
  //   - REST tools: (server, SECTORS_API_BASE, apiKey) -> api.sectors.app/v2
  //     All REST tools are auto-generated from schema.json
  //   - Supabase tools: (server, env) -> Supabase-backed queries (out of v2-parity scope)

  // --- Auto-generated REST tools (64 tools from schema.json) ---
  // Includes the full companies screener with structured (where) and natural language (q) queries
  Object.entries(GeneratedTools).forEach(([name, fn]) => {
    if (name.startsWith("register") && name.endsWith("Tool") && typeof fn === "function") {
      (fn as any)(server, SECTORS_API_BASE, apiKey);
    }
  });

  // --- Supabase-backed tools (out of scope for v2 REST parity; do not migrate) ---
  registerIPOCompaniesTool(server, env);
  registerHistoricalFinancialTool(server, env);
  registerCompaniesReportTool(server, env);
  registerDailyTransactionTool(server, env);
  registerCompanyDividendTool(server, env);
  registerCompanyFinancialTool(server, env);
  registerSubsectorReportTool(server, env);
  registerTopCompaniesByMetricsTool(server, env);
  registerSingaporeCompanyHistoricalFinancialTool(server, env);
  registerSingaporeCompaniesReportTool(server, env);
  registerSingaporeDailyTransactionTool(server, env);
  registerSingaporeCompanyDividendTool(server, env);
  registerSingaporeTopCompaniesByMetricsTool(server, env);
  registerSingaporeEarningsYieldTool(server, env);
  registerSingaporeHistoricalVolatilityTool(server, env);
  registerCompaniesNipeTool(server, env);
}
