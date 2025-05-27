import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SECTORS_API_BASE, SECTORS_API_KEY } from "../config.js";

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
  registerSgxCompaniesBySectorTool(server, SECTORS_API_BASE, SECTORS_API_KEY);
}
