import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getSubsectors } from "./tools/subsectors.js";
import { getIndustries } from "./tools/industries.js";
import { fetchSubIndustries } from "./tools/subindustries.js";
import { fetchIndex } from "./tools/indexData.js";
import { fetchCompaniesBySubsector } from "./tools/companies.js";

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
  "fetch-companies",
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sectors MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
