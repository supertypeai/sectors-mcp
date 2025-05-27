import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SECTORS_API_BASE, SECTORS_API_KEY } from "../config.js";

// Import tool modules
import { registerSubsectorsTool } from "./subsectors.js";
import { registerIndustriesTool } from "./industries.js";
import { registerSubIndustriesTool } from "./subindustries.js";
import { registerIndexTool } from "./index-data.js";
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
import { registerCompaniesByIndexTool } from "./companies-by-index.js";
import { registerCompanyReportTool } from "./company-report.js";
import { registerSgxSectorsTool } from "./sgx-sectors.js";
import { registerSGXCompanyReportTool } from "./sgx-company-report.js";
import { registerSgxTopCompaniesTool } from "./sgx-top-companies.js";
import { registerIndexDailyTool } from "./index-daily.js";
import { registerIDXMarketCapTool } from "./idx-marketcap.js";
import { registerTopCompanyMoversTool } from "./top-movers.js";
import { registerMostTradedTool } from "./most-traded.js";
import { registerTopGrowthTool } from "./top-growth.js";
import { registerTopCompaniesTool } from "./top-companies.js";

export function registerAllTools(server: McpServer) {
  // Register all tools
  registerSubsectorsTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerIndustriesTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerSubIndustriesTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerIndexTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerCompaniesBySubsectorTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerCompaniesBySubindustryTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerCompaniesWithSegmentsTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerListingPerformanceTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerQuarterlyFinancialDatesTool(
    server,
    SECTORS_API_BASE,
    SECTORS_API_KEY
  );
  registerQuarterlyFinancialsTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerCompanySegmentsTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerCompaniesByIndexTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerCompanyReportTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerSgxSectorsTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerSGXCompanyReportTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerSgxCompaniesBySectorTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerSgxTopCompaniesTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerIndexDailyTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerMostTradedTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerTopCompanyMoversTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerTopCompaniesTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerMostTradedTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerTopGrowthTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
  registerIDXMarketCapTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
}
