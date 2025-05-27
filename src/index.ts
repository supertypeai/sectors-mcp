import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse, formatNumber } from "./utils/api.js";
import { getSubsectors } from "./tools/subsectors.js";
import { getIndustries } from "./tools/industries.js";
import { fetchSubIndustries } from "./tools/subindustries.js";
import { fetchIndex } from "./tools/indexData.js";
import { fetchCompaniesByIndex } from "./tools/companiesByIndex.js";
import {
  fetchCompaniesBySubsector,
  fetchCompaniesBySubindustry,
  fetchCompaniesWithSegments,
  fetchListingPerformance,
  fetchQuarterlyFinancialDates,
  fetchQuarterlyFinancials,
} from "./tools/companies.js";

const SECTORS_API_BASE = "https://api.sectors.app/v1";
const SECTORS_API_KEY = process.env.SECTORS_API_KEY;

const server = new McpServer({
  name: "sectors-mcp",
  version: "1.0.0",
});

// Register tools
server.tool("get-subsectors", "Get list of subsectors", async () => {
  try {
    const subsectorsText = await getSubsectors(
      SECTORS_API_BASE,
      SECTORS_API_KEY
    );
    return {
      content: [
        {
          type: "text",
          text: `API URL: ${SECTORS_API_BASE}/subsectors\n\n${subsectorsText}`,
        },
      ],
    };
  } catch (error: any) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }] };
  }
});

server.tool(
  "fetch-industries",
  "Fetch industries from the Sectors API",
  async () => {
    try {
      const industriesText = await getIndustries(
        SECTORS_API_BASE,
        SECTORS_API_KEY
      );
      return {
        content: [
          {
            type: "text",
            text: `API URL: ${SECTORS_API_BASE}/industries\n\n${industriesText}`,
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchSubIndustries as an MCP tool
server.tool(
  "fetch-subindustries",
  "Fetch subindustries from the Sectors API",
  async () => {
    try {
      const subIndustriesData = await fetchSubIndustries(
        SECTORS_API_BASE,
        SECTORS_API_KEY
      );
      return {
        content: [
          {
            type: "text",
            text: `API URL: ${SECTORS_API_BASE}/subindustries\n\nFetched subindustries:\n\n${JSON.stringify(
              subIndustriesData,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchIndex as an MCP tool
server.tool(
  "fetch-index",
  "Fetch index data from the Sectors API",
  {
    index: z.string().describe("The index to fetch data for"),
  },
  async ({ index }) => {
    try {
      const indexData = await fetchIndex(
        SECTORS_API_BASE,
        SECTORS_API_KEY,
        index
      );
      return {
        content: [
          {
            type: "text",
            text: `API URL: ${SECTORS_API_BASE}/index/${index}\n\nFetched index data:\n\n${JSON.stringify(
              indexData,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchCompaniesBySubsector as an MCP tool
server.tool(
  "fetch-companies-by-subsector",
  "Fetch companies by subsector from the Sectors API",
  {
    subSector: z.string().describe("The subsector to fetch companies for"),
  },
  async ({ subSector }) => {
    try {
      const companiesData = await fetchCompaniesBySubsector(
        SECTORS_API_BASE,
        SECTORS_API_KEY,
        subSector
      );
      return {
        content: [
          {
            type: "text",
            text: `API URL: ${SECTORS_API_BASE}/companies/?sub_sector=${subSector}\n\nFetched companies:\n\n${JSON.stringify(
              companiesData,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchCompaniesBySubindustry as an MCP tool
server.tool(
  "fetch-company-by-subindustry",
  "Fetch companies by subindustry from the Sectors API",
  {
    subIndustry: z.string().describe("The subindustry to fetch companies for"),
  },
  async ({ subIndustry }) => {
    try {
      const companiesData = await fetchCompaniesBySubindustry(
        SECTORS_API_BASE,
        SECTORS_API_KEY,
        subIndustry
      );
      return {
        content: [
          {
            type: "text",
            text: `API URL: ${SECTORS_API_BASE}/companies/?sub_industry=${subIndustry}\n\nFetched companies:\n\n${JSON.stringify(
              companiesData,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchCompaniesByIndex as an MCP tool
server.tool(
  "fetch-companies-by-index",
  "Fetch companies by stock index from the Sectors API",
  {
    index: z.string().describe("The index name (e.g., 'lq45', 'idx30', 'kompas100')")
  },
  async ({ index }) => {
    try {
      const companies = await fetchCompaniesByIndex(
        SECTORS_API_BASE,
        SECTORS_API_KEY,
        index
      );
      return {
        content: [
          {
            type: "text",
            text: `Companies in index ${index}:\n${JSON.stringify(
              companies,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchQuarterlyFinancialDates as an MCP tool
server.tool(
  "fetch-quarterly-financial-dates",
  "Fetch quarterly financial dates for a company",
  {
    ticker: z.string().min(1, "Ticker is required").describe("Company ticker (e.g., 'BBRI' or 'BBRI.JK')")
  },
  async ({ ticker }) => {
    try {
      const financialDates = await fetchQuarterlyFinancialDates(
        SECTORS_API_BASE,
        SECTORS_API_KEY,
        ticker
      );
      
      // Format the response for better readability
      const formattedResponse = Object.entries(financialDates)
        .sort(([yearA], [yearB]) => parseInt(yearB) - parseInt(yearA)) // Sort years in descending order
        .map(([year, quarters]) => {
          const quartersList = quarters
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime()) // Sort quarters chronologically
            .map(([date, quarter]) => `  • ${date} (${quarter})`)
            .join('\n');
          return `${year}:\n${quartersList}`;
        })
        .join('\n\n');
      
      return {
        content: [
          {
            type: "text",
            text: `Quarterly Financial Dates for ${ticker.toUpperCase()}:\n\n${formattedResponse}\n\n` +
                  `API Endpoint: ${SECTORS_API_BASE}/company/get_quarterly_financial_dates/${ticker}/`
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchQuarterlyFinancials as an MCP tool
server.tool(
  "fetch-quarterly-financials",
  "Fetch quarterly financial data for a company from the Sectors API",
  {
    ticker: z
      .string()
      .min(1, "Ticker is required")
      .describe("Company ticker (e.g., 'BBRI' or 'BBRI.JK')"),
    reportDate: z
      .string()
      .optional()
      .describe("Report date in YYYY-MM-DD format"),
    approx: z
      .boolean()
      .optional()
      .describe("If true, returns closest available date when exact date not found"),
    nQuarters: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Number of latest consecutive quarters to return"),
  },
  async ({ ticker, reportDate, approx, nQuarters }) => {
    try {
      const financials = await fetchQuarterlyFinancials(
        SECTORS_API_BASE,
        SECTORS_API_KEY,
        {
          ticker,
          reportDate,
          approx,
          nQuarters,
        }
      );

      // Format the response for better readability
      const formattedResponse = financials
        .map((data) => {
          const metrics = [
            `Date: ${data.date}`,
            `Revenue: ${data.revenue ? formatNumber(data.revenue) : 'N/A'}`,
            `Net Income: ${data.earnings ? formatNumber(data.earnings) : 'N/A'}`,
            `Total Assets: ${data.total_assets ? formatNumber(data.total_assets) : 'N/A'}`,
            `Total Liabilities: ${data.total_liabilities ? formatNumber(data.total_liabilities) : 'N/A'}`,
            `Total Equity: ${data.total_equity ? formatNumber(data.total_equity) : 'N/A'}`,
            `Operating Cash Flow: ${data.operating_cash_flow ? formatNumber(data.operating_cash_flow) : 'N/A'}`,
          ];

          // Add financial sector metrics if available
          if (data.financials_sector_metrics) {
            const m = data.financials_sector_metrics;
            metrics.push(
              '\nFinancial Sector Metrics:',
              `Net Interest Income: ${m.net_interest_income ? formatNumber(m.net_interest_income) : 'N/A'}`,
              `Total Deposit: ${m.total_deposit ? formatNumber(m.total_deposit) : 'N/A'}`,
              `Gross Loan: ${m.gross_loan ? formatNumber(m.gross_loan) : 'N/A'}`
            );
          }

          return metrics.join('\n');
        })
        .join('\n\n');

      return {
        content: [
          {
            type: "text",
            text: `Quarterly Financials for ${ticker.toUpperCase()}:\n\n${formattedResponse}\n\n` +
                  `API Endpoint: ${SECTORS_API_BASE}/financials/quarterly/${ticker}/`
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchCompaniesWithSegments as an MCP tool
server.tool(
  "fetch-companies-with-segments",
  "Fetch companies with segments from the Sectors API",
  async () => {
    try {
      const companiesData = await fetchCompaniesWithSegments(
        SECTORS_API_BASE,
        SECTORS_API_KEY
      );
      return {
        content: [
          {
            type: "text",
            text: `API URL: ${SECTORS_API_BASE}/companies/list_companies_with_segments/\n\nFetched companies with segments:\n\n${JSON.stringify(
              companiesData,
              null,
              2
            )}`,
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

// Register fetchListingPerformance as an MCP tool
server.tool(
  "fetch-listing-performance",
  "Fetch company's performance since IPO from the Sectors API",
  {
    ticker: z
      .string()
      .min(1, "Ticker is required")
      .describe("Company ticker (e.g., 'GOTO' or 'GOTO.JK')"),
  },
  async ({ ticker }) => {
    try {
      const performanceData = await fetchListingPerformance(
        SECTORS_API_BASE,
        SECTORS_API_KEY,
        ticker
      );
      
      // Format the response for better readability
      const formattedResponse = `Symbol: ${performanceData.symbol}

Price Changes Since IPO:
  7 Days:    ${(performanceData.chg_7d * 100).toFixed(2)}%
  30 Days:   ${(performanceData.chg_30d * 100).toFixed(2)}%
  90 Days:   ${(performanceData.chg_90d * 100).toFixed(2)}%
  1 Year:    ${(performanceData.chg_365d * 100).toFixed(2)}%`;
      
      return {
        content: [
          {
            type: "text",
            text: `${formattedResponse}\n\n` +
                  `Note: Listing performance data is only available for tickers listed after May 2005.\n` +
                  `API Endpoint: ${SECTORS_API_BASE}/listing-performance/${ticker}/`
          },
        ],
      };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sectors MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
