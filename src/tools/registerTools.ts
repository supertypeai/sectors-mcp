import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SECTORS_API_BASE } from "../config.js";

// Import tool modules
import { registerSubsectorsTool } from "./subsectors.js";
import { registerIndustriesTool } from "./industries.js";
import { registerSubIndustriesTool } from "./subindustries.js";
import { registerIndexTool } from "./indexData.js";
import {
  registerCompaniesBySubsectorTool,
  registerCompaniesBySubindustryTool,
  registerCompaniesWithSegmentsTool,
  registerListingPerformanceTool,
  registerQuarterlyFinancialDatesTool,
  registerQuarterlyFinancialsTool,
  registerCompanySegmentsTool,
  registerSgxCompaniesBySectorTool,
} from "./companies.js";
import { registerCompaniesByIndexTool } from "./companiesByIndex.js";
import { registerCompanyReportTool } from "./companyReport.js";
import { registerSgxSectorsTool } from "./sgxSectors.js";
import { registerSGXCompanyReportTool } from "./sgxCompanyReport.js";
import { registerSgxTopCompaniesTool } from "./sgxTopCompanies.js";
import { registerIndexDailyTool } from "./indexDaily.js";
import { registerIDXMarketCapTool } from "./idxMarketCap.js";
import { registerTopCompanyMoversTool } from "./topMovers.js";
import { registerMostTradedTool } from "./mostTraded.js";
import { registerTopGrowthTool } from "./topGrowth.js";
import { registerTopCompaniesTool } from "./topCompanies.js";
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

export function registerAllTools(server: McpServer, apiKey: string, env?: any) {
  // Register all tools
  registerSubsectorsTool(server, SECTORS_API_BASE, apiKey);
  registerIndustriesTool(server, SECTORS_API_BASE, apiKey);
  registerSubIndustriesTool(server, SECTORS_API_BASE, apiKey);
  registerIndexTool(server, SECTORS_API_BASE, apiKey);
  registerCompaniesBySubsectorTool(server, SECTORS_API_BASE, apiKey);
  registerCompaniesBySubindustryTool(server, SECTORS_API_BASE, apiKey);
  registerCompaniesWithSegmentsTool(server, SECTORS_API_BASE, apiKey);
  registerListingPerformanceTool(server, SECTORS_API_BASE, apiKey);
  registerQuarterlyFinancialDatesTool(server, SECTORS_API_BASE, apiKey);
  registerQuarterlyFinancialsTool(server, SECTORS_API_BASE, apiKey);
  registerCompanySegmentsTool(server, SECTORS_API_BASE, apiKey);
  registerCompaniesByIndexTool(server, SECTORS_API_BASE, apiKey);
  registerCompanyReportTool(server, SECTORS_API_BASE, apiKey);
  registerSgxSectorsTool(server, SECTORS_API_BASE, apiKey);
  registerSGXCompanyReportTool(server, SECTORS_API_BASE, apiKey);
  registerSgxCompaniesBySectorTool(server, SECTORS_API_BASE, apiKey);
  registerSgxTopCompaniesTool(server, SECTORS_API_BASE, apiKey);
  registerIndexDailyTool(server, SECTORS_API_BASE, apiKey);
  registerTopCompanyMoversTool(server, SECTORS_API_BASE, apiKey);
  registerTopCompaniesTool(server, SECTORS_API_BASE, apiKey);
  registerMostTradedTool(server, SECTORS_API_BASE, apiKey);
  registerTopGrowthTool(server, SECTORS_API_BASE, apiKey);
  registerIDXMarketCapTool(server, SECTORS_API_BASE, apiKey);
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
}
