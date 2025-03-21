import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SECTORS_API_BASE = "https://api.sectors.app/v1/";
const SECTORS_API_KEY = process.env.SECTORS_API_KEY;

// Create server instance
const server = new McpServer({
  name: "sectors-mcp",
  version: "1.0.0",
});

// Subsector list retrieval
server.tool(
  "get-subsectors",
  "Get list of subsectors",
  { params: z.string().describe("Fill this with any string").default("abc") },
  async ({ params }) => {
    if (!SECTORS_API_KEY) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve subsectors: SECTORS_API_KEY not found",
          },
        ],
      };
    }
    const response = await fetch(`${SECTORS_API_BASE}subsectors/`, {
      method: "GET",
      headers: {
        Authorization: SECTORS_API_KEY,
      },
    }).catch((err) => console.error(err));
    if (!response?.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve subsectors: ${response?.statusText}`,
          },
        ],
      };
    }
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `API URL: ${SECTORS_API_BASE}subsectors\n\n Here are the list of subsectors:\n\n${data
            .map(
              (item: any) =>
                `• Sector : ${item.sector}, Subsector : ${item.subsector}`
            )
            .join("\n")}`,
        },
      ],
    };
  }
);

const fetchIndustries = async () => {
  if (!SECTORS_API_KEY) {
    return {
      content: [
        {
          type: "text",
          text: "You are unauthorized, make sure to put your API Key on MCP Settings",
        },
      ],
    };
  }
  const options = {
    method: "GET",
    headers: {
      Authorization: SECTORS_API_KEY,
    },
  };

  return fetch("https://api.sectors.app/v1/industries/", options)
    .then((response) => response.json())
    .catch((err) => console.error(err));
};

// Register fetchIndustries as an MCP tool
server.tool(
  "fetch-industries",
  "Fetch industries from the Sectors API",
  {
    params: z.string().default("abc").optional(),
  },
  async ({ params }) => {
    const industriesData = await fetchIndustries();

    if (!industriesData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve industries data",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `API URL: ${SECTORS_API_BASE}industries\n\nFetched industries:\n\n${industriesData
            .map(
              (result: any) =>
                `- Subsector: ${result.subsector}\n- Industry: ${result.industry}`
            )
            .join("\n")}`,
        },
      ],
    };
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
