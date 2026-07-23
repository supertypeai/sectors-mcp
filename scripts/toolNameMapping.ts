/**
 * Definitive mapping from schema operationIds to tool names.
 * Maps operationId → tool name for endpoints that need disambiguation
 * (collapsing report pairs, renaming for clarity). Endpoints NOT in this map
 * are auto-derived by the generator: strip _retrieve/_list/_2 suffix and
 * snake_case → kebab-case (e.g. `forex_daily_retrieve` → `fetch-forex-daily`).
 * Add entries here only when the default name is wrong or a name collision
 * requires collapsing two operationIds into one tool.
 *
 * Collapses: the 4 report pairs (company/klse/sgx/subsector _retrieve vs
 * _retrieve_2) are merged into one tool each. The list variants of these pairs
 * (no path symbol) document endpoints the live API rejects with 400 (e.g.
 * /v2/company/report/ → "Please provide a valid stock symbol"). They are
 * collapsed onto the detail tool to avoid exposing callable tools that always
 * 400.
 */
export const OPERATION_ID_TO_TOOL_NAME: Record<string, string> = {
  // Brokers (6 endpoints -> 6 tool names)
  "broker_activity_retrieve": "fetch-broker-activity",
  "broker_activity_top_retrieve": "fetch-broker-activity-top",
  "broker_summary_retrieve": "fetch-broker-summary",
  "broker_summary_top_retrieve": "fetch-broker-summary-top",
  "brokers_retrieve": "fetch-brokers",
  "brokers_top_retrieve": "fetch-top-brokers",
  
  // Companies Screener (4 endpoints -> 4 tool names)
  "companies_retrieve": "fetch-companies-by-subsector", // /v2/companies/ used for list by sub_sector
  "companies_list_companies_with_segments_retrieve": "fetch-companies-with-segments",
  "companies_top_changes_retrieve": "fetch-companies-top-changes",
  // fetch-companies-by-subindustry maps to companies_retrieve with sub_industry filter
  // We'll handle this separately or accept that it maps to companies_retrieve
  
  // Company Reports (8 endpoints)
  "company_corporate_actions_retrieve": "fetch-corporate-actions",
  "company_get_segments_retrieve": "fetch-company-segments", // simplified name
  "company_get_quarterly_financial_dates_retrieve": "fetch-quarterly-financial-dates",
  "company_report_retrieve": "fetch-company-report", // no symbol in path: list variant 400s in live API; collapsed to detail tool
  "company_report_retrieve_2": "fetch-company-report", // with symbol: detail endpoint (the working one)
  "company_shareholders_composition_retrieve": "fetch-shareholders-composition",
  "daily_retrieve": "fetch-daily-transaction",
  "financials_quarterly_retrieve": "fetch-quarterly-financials",
  
  // Detailed Reports / Market Data
  "filings_retrieve": "fetch-filings",
  "foreign_flow_retrieve": "fetch-foreign-flow",
  "free_float_retrieve": "fetch-free-float",
  "idx_total_retrieve": "fetch-idx-market-cap", // manual tool name
  "index_daily_retrieve": "fetch-index-daily",
  "listing_performance_retrieve": "fetch-listing-performance",
  "news_retrieve": "fetch-news",
  "subsector_report_retrieve": "fetch-subsector-report", // no sub_sector: list variant 400s in live API; collapsed to detail tool
  "subsector_report_retrieve_2": "fetch-subsector-report", // with sub_sector: detail endpoint (the working one)
  "suspensions_retrieve": "fetch-suspensions",
  "most_traded_retrieve": "fetch-most-traded-stocks",
  
  // Helper Lists (7 endpoints)
  "industries_list": "fetch-industries",
  "subindustries_list": "fetch-subindustries",
  "subsectors_list": "get-subsectors", // manual uses get- prefix for this one
  "tags_list": "fetch-tags",
  "klse_sectors_list": "fetch-klse-sectors",
  "sgx_sectors_list": "fetch-sgx-sectors",
  "sgx_subsectors_list": "fetch-sgx-subsectors",
  
  // KLSE (4 endpoints)
  "klse_companies_list": "fetch-klse-companies-by-sector",
  "klse_companies_top_retrieve": "fetch-klse-top-companies",
  "klse_company_report_retrieve": "fetch-klse-company-report", // no symbol: list variant 400s in live API; collapsed to detail tool
  "klse_company_report_retrieve_2": "fetch-klse-company-report", // with symbol: detail endpoint (the working one)
  
  // SGX (4 endpoints)
  "sgx_companies_retrieve": "fetch-sgx-companies-by-sector", // manual uses by-sector version
  "sgx_companies_top_retrieve": "fetch-sgx-top-companies",
  "sgx_company_report_retrieve": "fetch-sgx-company-report", // no symbol: list variant 400s in live API; collapsed to detail tool
  "sgx_company_report_retrieve_2": "fetch-sgx-company-report", // with symbol: detail endpoint (the working one)
  
  // SGX Market Data (6 endpoints)
  "sgx_buybacks_retrieve": "fetch-sgx-buybacks",
  "sgx_daily_retrieve": "fetch-sgx-daily-transaction",
  "sgx_filings_retrieve": "fetch-sgx-filings",
  "sgx_news_retrieve": "fetch-sgx-news",
  "sgx_short_sell_retrieve": "fetch-sgx-short-sell",
  "sgx_tags_retrieve": "fetch-sgx-tags",
  
  // Mining Commodities (5 endpoints)
  "mining_commodities_retrieve": "fetch-mining-commodities",
  "mining_commodities_price_retrieve": "fetch-mining-commodity-price",
  "mining_contracts_retrieve": "fetch-mining-contracts",
  "mining_exports_retrieve": "fetch-mining-exports",
  "mining_global_commodity_retrieve": "fetch-mining-global-commodity",
  
  // Mining Companies (5 endpoints)
  "mining_companies_retrieve": "fetch-mining-companies", // list
  "mining_companies_retrieve_2": "fetch-mining-company-detail", // single
  "mining_companies_financials_retrieve": "fetch-mining-company-financials",
  "mining_companies_ownership_retrieve": "fetch-mining-company-ownership",
  "mining_companies_performance_retrieve": "fetch-mining-company-performance",
  
  // Mining Licenses (4 endpoints)
  "mining_licenses_retrieve": "fetch-mining-licenses",
  "mining_license_auctions_retrieve": "fetch-mining-license-auctions",
  "mining_license_auctions_retrieve_2": "fetch-mining-license-auction-detail",
  "mining_sales_destination_retrieve": "fetch-mining-sales-destination",
  
  // Mining Sites (5 endpoints)
  "mining_sites_retrieve": "fetch-mining-sites",
  "mining_sites_retrieve_2": "fetch-mining-site-detail",
  "mining_total_production_retrieve": "fetch-mining-total-production",
  "mining_resources_reserves_retrieve": "fetch-mining-resources-reserves",
  "mining_resources_reserves_retrieve_2": "fetch-mining-resources-reserves-detail",
};
