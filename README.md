# Sectors MCP Server

A Model Context Protocol (MCP) server that provides financial market data and analysis tools, with a focus on stock market sectors, indices, and company data. This server is deployed as a Cloudflare Worker and uses Server-Sent Events (SSE) transport for real-time communication.

## 🚀 Quick Start - Use Cloud-Hosted Server

**No installation required!** Connect directly to our cloud-hosted MCP server.

### Option 1: Native SSE Transport

For MCP clients that support SSE transport natively:

```javascript
{
  mcpServers: {
    sectors: {
      transport: {
        type: 'sse',
        url: 'https://sectors-mcp.aidityasadhakim250.workers.dev/sse',
        headers: {
          Authorization: `Bearer ${process.env.SECTORS_API_KEY}`,
        },
      },
    },
  },
}
```

### Option 2: stdio via mcp-remote

For Claude Desktop, Claude Code, or other stdio-based clients, use `mcp-remote` as a bridge:

```json
{
  "mcpServers": {
    "sectors": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://sectors-mcp.aidityasadhakim250.workers.dev/sse",
        "--header",
        "Authorization:${AUTH_TOKEN}"
      ],
      "env": {
        "AUTH_TOKEN": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

Get your [Sectors API key](https://sectors.app) and start using all available tools immediately!

## Features

- **Market Indices Data**: Access to various stock market indices and their historical data
- **Company Information**: Detailed company reports, financials, and performance metrics
- **Sector & Industry Analysis**: Tools for analyzing companies by sector, subsector, and industry
- **SGX (Singapore Exchange) Data**: Specialized tools for Singapore Exchange listed companies
- **IDX (Indonesia Exchange) Data**: Comprehensive tools for Indonesian stocks and indices
- **Market Analysis**: Tools for identifying top movers, most traded stocks, and growth companies
- **Financial Reporting**: Access to quarterly financials, historical data, and reporting dates
- **Advanced Metrics**: Earnings yield, historical volatility, and more

## Self-Hosting Options

### Option 1: Deploy to Cloudflare Workers (Recommended)

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables in Cloudflare dashboard or `.dev.vars`:

```env
SECTORS_API_KEY=your_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

4. Deploy to Cloudflare:

```bash
npm run deploy
```

### Option 2: Run Locally for Development

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.dev.vars` file with environment variables:

```env
SECTORS_API_KEY=your_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

4. Start the development server:

```bash
npm run dev
```

## Available Tools

### Market Indices & Data

- `fetch-index`: Fetch data for a specific market index
- `fetch-index-daily`: Get daily transaction data for an index
- `fetch-idx-market-cap`: Retrieve historical market capitalization data for IDX
- `fetch-daily-transaction`: Get daily transaction data for Indonesian stocks
- `fetch-singapore-daily-transaction`: Get daily transaction data for SGX stocks

### Company Reports & Information

**Indonesia (IDX):**
- `fetch-company-report`: Get comprehensive company reports with overview, financials, valuation
- `fetch-companies-report`: Batch fetch multiple company reports
- `fetch-company-segments`: Access company revenue breakdown by segments
- `fetch-listing-performance`: View listing performance metrics (7d, 30d, 90d, 365d changes)
- `fetch-ipo-companies`: Get information about IPO companies

**Singapore (SGX):**
- `fetch-sgx-company-report`: Specialized comprehensive reports for SGX-listed companies
- `fetch-singapore-companies-report`: Batch fetch SGX company reports

### Financial Data

**Indonesia (IDX):**
- `fetch-quarterly-financials`: Access quarterly financial statements
- `fetch-quarterly-financial-dates`: Get reporting dates for financials
- `fetch-historical-financial`: Get historical financial data
- `fetch-company-financial`: Fetch detailed company financials
- `fetch-company-dividend`: Get dividend information and history

**Singapore (SGX):**
- `fetch-singapore-company-historical-financial`: Get historical financials for SGX companies
- `fetch-singapore-company-dividend`: Get SGX company dividend data

### Sector & Industry Analysis

**Indonesia (IDX):**
- `get-subsectors`: List all available subsectors
- `fetch-subindustries`: Get subindustry data
- `fetch-industries`: Access industry information
- `fetch-companies-by-subsector`: Find companies by subsector
- `fetch-companies-by-subindustry`: Find companies by subindustry
- `fetch-companies-by-index`: Get companies listed in a specific index
- `fetch-subsector-report`: Get comprehensive subsector analysis
- `fetch-companies-nipe`: Get NIPE (Net Income to Price to Equity) data

**Singapore (SGX):**
- `fetch-sgx-sectors`: List all available SGX sectors
- `fetch-sgx-companies-by-sector`: Find SGX-listed companies by sector
- `fetch-sgx-top-companies`: Get top performing SGX companies

### Market Analysis & Rankings

**Indonesia (IDX):**
- `fetch-top-companies`: Get top companies by various metrics
- `fetch-top-companies-by-metrics`: Advanced filtering with custom metrics
- `fetch-top-company-movers`: Identify top gaining and losing stocks
- `fetch-top-growth-companies`: Find companies with highest growth metrics
- `fetch-most-traded-stocks`: Get most actively traded stocks

**Singapore (SGX):**
- `fetch-singapore-top-companies-by-metrics`: Top SGX companies by custom metrics
- `fetch-singapore-earnings-yield`: Calculate and rank by earnings yield
- `fetch-singapore-historical-volatility`: Analyze historical price volatility

## Architecture & Implementation

### Technology Stack

- **Runtime**: Cloudflare Workers with Durable Objects
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.13.1
- **Agent Framework**: `agents` package for MCP agent management
- **Data Storage**: Supabase for persistent data
- **API Client**: Sectors API for financial data
- **Transport**: Server-Sent Events (SSE) for real-time communication
- **Validation**: Zod for schema validation
- **Language**: TypeScript

### Project Structure

```
src/
├── index.ts                 # Main worker entry point with SSE routing
├── config.ts               # Configuration and environment variables
├── lib/
│   └── supabaseClient.ts  # Supabase client initialization
├── tools/                 # MCP tool implementations
│   ├── registerTools.ts   # Central tool registration
│   ├── companies.ts       # Company data tools
│   ├── companyReport.ts   # Company reports
│   ├── indexData.ts       # Index data tools
│   ├── topMovers.ts       # Market movers analysis
│   ├── sgx*.ts           # Singapore Exchange tools
│   ├── getSingapore*.ts  # Advanced SGX analytics
│   └── ...               # Other specialized tools
├── types/
│   └── api.ts            # TypeScript type definitions
└── utils/
    └── api.ts            # API utility functions

build/                     # Compiled JavaScript output
wrangler.jsonc            # Cloudflare Workers configuration
```

### How It Works

1. **Cloudflare Worker Entry Point** (`src/index.ts`):
   - Handles incoming HTTP requests
   - Validates API key via `Authorization: Bearer <token>` header
   - Routes requests to appropriate endpoints:
     - `/sse` - SSE transport for MCP communication
     - `/mcp` - Alternative MCP endpoint
   - Uses Durable Objects for stateful MCP agent instances

2. **MCP Agent** (`MyMCP` class):
   - Extends `McpAgent` from the agents framework
   - Initializes MCP server with name and version
   - Registers all tools during initialization
   - Handles tool execution with proper authentication

3. **Tool Registration** (`src/tools/registerTools.ts`):
   - Centralized registration of 40+ financial data tools
   - Each tool is configured with:
     - Name and description
     - Zod schema for input validation
     - Handler function for API calls
     - Error handling and response formatting

4. **API Communication** (`src/utils/api.ts`):
   - Creates standardized API headers with authentication
   - Handles API responses and error cases
   - Formats data for MCP protocol responses

5. **Authentication Flow**:
   ```
   Client Request → Authorization Header Check → Token Extraction →
   → Store in Context → Pass to Tools → API Calls with Token
   ```

### Environment Variables

The server requires these environment variables (configured in Cloudflare Workers dashboard or `.dev.vars`):

- `SECTORS_API_KEY`: Your Sectors API key for accessing financial data
- `SUPABASE_URL`: Supabase project URL (for persistent storage features)
- `SUPABASE_ANON_KEY`: Supabase anonymous key

### SSE Transport

The server uses Server-Sent Events (SSE) transport which provides:
- Real-time streaming communication
- Better performance than traditional request/response
- Automatic reconnection handling
- Efficient for multiple tool calls

Example client configuration:
```javascript
{
  transport: {
    type: 'sse',
    url: 'https://sectors-mcp.aidityasadhakim250.workers.dev/sse',
    headers: {
      Authorization: `Bearer ${process.env.SECTORS_API_KEY}`,
    },
  },
}
```

## Usage Examples

### With Claude Desktop or Claude Code

Add to your configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "sectors": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://sectors-mcp.aidityasadhakim250.workers.dev/sse",
        "--header",
        "Authorization:${AUTH_TOKEN}"
      ],
      "env": {
        "AUTH_TOKEN": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

This uses `mcp-remote` to bridge the SSE connection into stdio.

### With MCP Client (TypeScript/JavaScript)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client({
  name: "sectors-client",
  version: "1.0.0"
});

const transport = new SSEClientTransport(
  new URL("https://sectors-mcp.aidityasadhakim250.workers.dev/sse"),
  {
    headers: {
      Authorization: `Bearer ${process.env.SECTORS_API_KEY}`
    }
  }
);

await client.connect(transport);

// Use tools
const result = await client.callTool({
  name: "fetch-company-report",
  arguments: {
    ticker: "BBCA",
    sections: "overview,financials,valuation"
  }
});
```

## Development

### Local Development

1. Start the development server:
```bash
npm run dev
```

2. The server will be available at `http://localhost:8787`

3. Test SSE endpoint:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:8787/sse
```

### Adding New Tools

1. Create a new file in `src/tools/` (e.g., `myNewTool.ts`):

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export function registerMyNewTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "my-new-tool",
    "Description of what this tool does",
    {
      param1: z.string().describe("Description of param1"),
      param2: z.number().optional().describe("Optional param2"),
    },
    async ({ param1, param2 }) => {
      try {
        const response = await fetch(
          `${baseUrl}/endpoint/${param1}`,
          {
            method: "GET",
            headers: createApiHeaders(apiKey),
          }
        );
        const data = await handleApiResponse(response);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
```

2. Register the tool in `src/tools/registerTools.ts`:

```typescript
import { registerMyNewTool } from "./myNewTool.js";

export function registerAllTools(server: McpServer, apiKey: string, env?: any) {
  // ... existing registrations
  registerMyNewTool(server, SECTORS_API_BASE, apiKey);
}
```

3. Rebuild and test:
```bash
npm run dev
```

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

This will:
- Compile TypeScript to JavaScript
- Upload to Cloudflare Workers
- Configure Durable Objects
- Set up routes and observability

### Type Checking

Run TypeScript type checking without building:

```bash
npm run type-check
```

### Generate Cloudflare Types

Generate TypeScript types for Cloudflare Workers:

```bash
npm run cf-typegen
```

## API Data Sources

This server integrates with multiple data sources:

1. **Sectors API** (https://sectors.app/api)
   - Primary source for Indonesian (IDX) market data
   - Singapore (SGX) market data
   - Real-time and historical financial data
   - Requires API key for authentication

2. **Supabase**
   - Caching layer for frequently accessed data
   - Custom analytics and computed metrics
   - Historical data storage

## Dependencies

### Core Dependencies
- `@modelcontextprotocol/sdk` (v1.13.1): MCP server implementation
- `agents` (v0.0.100): MCP agent framework with Durable Objects support
- `zod` (v3.25.67): Schema validation for tool inputs
- `@supabase/supabase-js` (v2.86.0): Supabase client for data storage

### Development Dependencies
- `typescript` (v5.8.3): TypeScript compiler
- `wrangler` (v4.24.3): Cloudflare Workers CLI
- `@types/node` (v24.10.1): Node.js type definitions

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug or have a feature request? Open an issue on GitHub
2. **Add Tools**: Implement new financial data tools following the patterns in `src/tools/`
3. **Improve Documentation**: Help improve this README or add code comments
4. **Test Coverage**: Add tests for existing or new functionality

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test locally with `npm run dev`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is part of the Sectors financial data platform.

## Support

- **Documentation**: [Sectors API Docs](https://sectors.app/api)
- **API Key**: Get your API key at [sectors.app](https://sectors.app)
- **Issues**: Report issues on the GitHub repository

## Related Resources

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Sectors Financial Data Platform](https://sectors.app)
- [Supabase](https://supabase.com/)
