import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SECTORS_API_BASE } from "../config.js";

// Import tool modules
import { registerSubsectorsTool } from "./subsectors.js";
import { registerIndustriesTool } from "./industries.js";
import { registerSubIndustriesTool } from "./subindustries.js";
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
import { registerSingaporeTopCompaniesByMetricsTool } from "./getSingaporeTopCompaniesByMetrics.js";
import { registerSingaporeEarningsYieldTool, registerSingaporeHistoricalVolatilityTool } from "./getSingaporeAdvancedMetrics.js";
import { registerCompaniesNipeTool } from "./getCompaniesNipe.js";
import { registerFreeFloatTool } from "./freeFloat.js";
import { registerTagsTool } from "./tags.js";
import { registerFilingsTool } from "./filings.js";
import { registerNewsTool } from "./news.js";
import { registerSubsectorReportRestTool } from "./subsectorReportRest.js";
import {
  registerKlseSectorsTool,
  registerKlseCompaniesBySectorTool,
  registerKlseTopCompaniesTool,
  registerKlseCompanyReportTool,
} from "./klse.js";
import {
  registerMiningCommoditiesTool,
  registerMiningCommodityPriceTool,
  registerMiningExportsTool,
  registerMiningGlobalCommodityTool,
  registerMiningContractsTool,
} from "./miningCommodities.js";
import {
  registerMiningCompaniesTool,
  registerMiningCompanyDetailTool,
  registerMiningCompanyFinancialsTool,
  registerMiningCompanyOwnershipTool,
  registerMiningCompanyPerformanceTool,
} from "./miningCompanies.js";
import {
  registerMiningLicensesTool,
  registerMiningLicenseAuctionsTool,
  registerMiningLicenseAuctionDetailTool,
  registerMiningSalesDestinationTool,
} from "./miningLicenses.js";
import {
  registerMiningSitesTool,
  registerMiningSiteDetailTool,
  registerMiningTotalProductionTool,
  registerMiningResourcesReservesTool,
  registerMiningResourcesReservesDetailTool,
} from "./miningSites.js";
import {
  registerBrokersTool,
  registerTopBrokersTool,
  registerBrokerActivityTool,
  registerBrokerActivityTopTool,
  registerBrokerSummaryTool,
  registerBrokerSummaryTopTool,
} from "./brokers.js";
import {
  registerCorporateActionsTool,
  registerShareholdersCompositionTool,
  registerForeignFlowTool,
  registerSuspensionsTool,
} from "./companyMarketData.js";
import {
  registerSgxBuybacksTool,
  registerSgxDailyTool,
  registerSgxFilingsTool,
  registerSgxNewsTool,
  registerSgxShortSellTool,
  registerSgxTagsTool,
} from "./sgxMarketData.js";

export function registerAllTools(server: McpServer, apiKey: string, env?: any) {
  // Two backends:
  //   - REST tools: (server, SECTORS_API_BASE, apiKey) -> api.sectors.app/v2
  //   - Supabase tools: (server, env) -> Supabase-backed queries (out of v2-parity scope)
  // Keep them distinct; never route a Supabase tool through the REST base or vice versa.

  // --- REST tools (api.sectors.app/v2) ---
  registerSubsectorsTool(server, SECTORS_API_BASE, apiKey);
  registerIndustriesTool(server, SECTORS_API_BASE, apiKey);
  registerSubIndustriesTool(server, SECTORS_API_BASE, apiKey);
  registerCompaniesBySubsectorTool(server, SECTORS_API_BASE, apiKey);
  registerCompaniesBySubindustryTool(server, SECTORS_API_BASE, apiKey);
  registerCompaniesWithSegmentsTool(server, SECTORS_API_BASE, apiKey);
  registerListingPerformanceTool(server, SECTORS_API_BASE, apiKey);
  registerQuarterlyFinancialDatesTool(server, SECTORS_API_BASE, apiKey);
  registerQuarterlyFinancialsTool(server, SECTORS_API_BASE, apiKey);
  registerCompanySegmentsTool(server, SECTORS_API_BASE, apiKey);
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

  // --- REST tools added/updated for v2 parity (api.sectors.app/v2) ---
  registerFreeFloatTool(server, SECTORS_API_BASE, apiKey);
  registerTagsTool(server, SECTORS_API_BASE, apiKey);
  registerFilingsTool(server, SECTORS_API_BASE, apiKey);
  registerNewsTool(server, SECTORS_API_BASE, apiKey);
  registerSubsectorReportRestTool(server, SECTORS_API_BASE, apiKey);
  registerKlseSectorsTool(server, SECTORS_API_BASE, apiKey);
  registerKlseCompaniesBySectorTool(server, SECTORS_API_BASE, apiKey);
  registerKlseTopCompaniesTool(server, SECTORS_API_BASE, apiKey);
  registerKlseCompanyReportTool(server, SECTORS_API_BASE, apiKey);
  registerMiningCommoditiesTool(server, SECTORS_API_BASE, apiKey);
  registerMiningCommodityPriceTool(server, SECTORS_API_BASE, apiKey);
  registerMiningExportsTool(server, SECTORS_API_BASE, apiKey);
  registerMiningGlobalCommodityTool(server, SECTORS_API_BASE, apiKey);
  registerMiningContractsTool(server, SECTORS_API_BASE, apiKey);
  registerMiningCompaniesTool(server, SECTORS_API_BASE, apiKey);
  registerMiningCompanyDetailTool(server, SECTORS_API_BASE, apiKey);
  registerMiningCompanyFinancialsTool(server, SECTORS_API_BASE, apiKey);
  registerMiningCompanyOwnershipTool(server, SECTORS_API_BASE, apiKey);
  registerMiningCompanyPerformanceTool(server, SECTORS_API_BASE, apiKey);
  registerMiningLicensesTool(server, SECTORS_API_BASE, apiKey);
  registerMiningLicenseAuctionsTool(server, SECTORS_API_BASE, apiKey);
  registerMiningLicenseAuctionDetailTool(server, SECTORS_API_BASE, apiKey);
  registerMiningSalesDestinationTool(server, SECTORS_API_BASE, apiKey);
  registerMiningSitesTool(server, SECTORS_API_BASE, apiKey);
  registerMiningSiteDetailTool(server, SECTORS_API_BASE, apiKey);
  registerMiningTotalProductionTool(server, SECTORS_API_BASE, apiKey);
  registerMiningResourcesReservesTool(server, SECTORS_API_BASE, apiKey);
  registerMiningResourcesReservesDetailTool(server, SECTORS_API_BASE, apiKey);

  // --- REST tools: IDX broker activity (api.sectors.app/v2) ---
  registerBrokersTool(server, SECTORS_API_BASE, apiKey);
  registerTopBrokersTool(server, SECTORS_API_BASE, apiKey);
  registerBrokerActivityTool(server, SECTORS_API_BASE, apiKey);
  registerBrokerActivityTopTool(server, SECTORS_API_BASE, apiKey);
  registerBrokerSummaryTool(server, SECTORS_API_BASE, apiKey);
  registerBrokerSummaryTopTool(server, SECTORS_API_BASE, apiKey);

  // --- REST tools: IDX company market data (api.sectors.app/v2) ---
  registerCorporateActionsTool(server, SECTORS_API_BASE, apiKey);
  registerShareholdersCompositionTool(server, SECTORS_API_BASE, apiKey);
  registerForeignFlowTool(server, SECTORS_API_BASE, apiKey);
  registerSuspensionsTool(server, SECTORS_API_BASE, apiKey);

  // --- REST tools: SGX market data (api.sectors.app/v2) ---
  registerSgxBuybacksTool(server, SECTORS_API_BASE, apiKey);
  registerSgxDailyTool(server, SECTORS_API_BASE, apiKey);
  registerSgxFilingsTool(server, SECTORS_API_BASE, apiKey);
  registerSgxNewsTool(server, SECTORS_API_BASE, apiKey);
  registerSgxShortSellTool(server, SECTORS_API_BASE, apiKey);
  registerSgxTagsTool(server, SECTORS_API_BASE, apiKey);
}
