# Sectors MCP Server

A Model Context Protocol (MCP) server that provides financial market data and analysis tools, with a focus on stock market sectors, indices, and company data. The server is deployed as a Cloudflare Worker and speaks the Streamable HTTP transport at the `/mcp` endpoint.

> ### Transport change (August 2026)
>
> The recommended endpoint is now `https://sectors-mcp.supertype.ai/mcp`, served over the Streamable HTTP transport. The older Server-Sent Events endpoint at `/sse` is deprecated. If you added Sectors using a `/sse` URL, please update your configuration to `/mcp` following the examples below. See the [Changelog](#changelog) for the full background.

## Quick Start, Use the Cloud-Hosted Server

No installation required. Connect directly to the cloud-hosted MCP server using your [Sectors API key](https://sectors.app).

### Option 1: Claude Desktop or Claude Code (CLI)

The easiest way to add Sectors to your Claude environment is the CLI:

```bash
claude mcp add --transport http sectors https://sectors-mcp.supertype.ai/mcp \
  --header "Authorization: Bearer YOUR_API_KEY_HERE"
```

### Option 2: Native Streamable HTTP Transport (Configuration)

For MCP clients that support the Streamable HTTP transport natively:

```javascript
{
  mcpServers: {
    sectors: {
      transport: {
        type: 'http',
        url: 'https://sectors-mcp.supertype.ai/mcp',
        headers: {
          Authorization: `Bearer ${process.env.SECTORS_API_KEY}`,
        },
      },
    },
  },
}
```

### Option 3: stdio via mcp-remote

For other stdio-based clients, use `mcp-remote` as a bridge:

```json
{
  "mcpServers": {
    "sectors": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://sectors-mcp.supertype.ai/mcp",
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

3. Configure environment variables in the Cloudflare dashboard or `.dev.vars`. The OAuth values are only needed if you want the double-proxy OAuth flow; direct API key auth works without them:

```env
SECTORS_API_KEY=your_api_key
SECTORS_OAUTH_CLIENT_ID=your_upstream_oauth_client_id
SECTORS_OAUTH_CLIENT_SECRET=your_upstream_oauth_client_secret
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
SECTORS_OAUTH_CLIENT_ID=your_upstream_oauth_client_id
SECTORS_OAUTH_CLIENT_SECRET=your_upstream_oauth_client_secret
```

4. Start the development server:

```bash
npm run dev
```

## Available Tools

The server provides **66 financial data tools** across multiple categories:

### Market Coverage

- **Indonesia (IDX)**: Comprehensive coverage of Indonesian stocks, indices, and market data
- **Singapore (SGX)**: Full SGX market data including equities, buybacks, short selling
- **Malaysia (KLSE)**: Bursa Malaysia company reports, sectors, and top performers
- **Mining Sector**: Specialized tools for mining commodities, contracts, licenses, production data

### Core Categories

**Company Data & Reports**
- Company reports (overview, financials, valuation, segments)
- Batch company reports for portfolio analysis
- Listing performance metrics (7d, 30d, 90d, 365d changes)
- IPO companies and corporate actions
- Shareholder composition and ownership data

**Financial Statements**
- Quarterly and annual financials
- Historical financial data across multiple periods
- Dividend history and yield calculations
- Earnings yield and advanced valuation metrics

**Market Indices & Trading Data**
- Index composition and daily performance
- Daily transaction data (volume, value, frequency)
- Market capitalization historical data
- Most traded stocks and top movers
- Foreign flow tracking

**Sector & Industry Analysis**
- Sector/subsector/industry hierarchies
- Companies by sector/subsector/industry
- Subsector reports with aggregated metrics
- Free float data and NIPE (Net Income to Price to Equity)

**Broker Activity**
- Individual broker activity and positions
- Top broker rankings by volume/value
- Broker summaries and trends

**News & Filings**
- Company news and announcements
- Regulatory filings and disclosures
- Trading suspensions and resumptions

**Advanced Analytics**
- Historical volatility calculations
- Earnings yield rankings
- Custom metric filtering and screening
- Tag-based company discovery

**Mining Sector (Specialized)**
- Mining companies and site details
- Commodity prices and global benchmarks
- Production data and exports
- License auctions and contracts
- Resources and reserves reporting

For a complete list of available tools and their parameters, connect to the server and use the MCP `tools/list` method.

## Architecture & Implementation

### Technology Stack

- **Runtime**: Cloudflare Workers, stateless with no Durable Object
- **MCP SDK**: `@modelcontextprotocol/sdk` and `@modelcontextprotocol/server` v2
- **Handler**: `createMcpHandler` from the `agents` package
- **API Client**: Sectors API for financial data
- **Transport**: Streamable HTTP at `/mcp`
- **Validation**: Zod for schema validation
- **Language**: TypeScript

### Project Structure

```
src/
├── index.ts                 # Worker entry point, stateless /mcp handler and OAuth routing
├── config.ts                # Configuration and environment variables
├── auth/                    # OAuth double-proxy implementation (KV backed)
│   ├── handlers.ts          # OAuth HTTP endpoints
│   ├── provider.ts          # Upstream token exchange and introspection
│   └── ...                  # Clients, PKCE, types
├── tools/
│   ├── registerTools.ts     # Central tool registration
│   └── generated/           # 66 tools generated from schema.json
├── types/
│   └── api.ts               # Shared TypeScript interfaces
└── utils/
    └── api.ts               # API headers and response handling

scripts/generateTools.ts     # Regenerates the tools from schema.json
wrangler.jsonc               # Cloudflare Workers configuration
```

### How It Works

1. **Cloudflare Worker Entry Point** (`src/index.ts`):
   - Handles incoming HTTP requests
   - Validates the API key from the `Authorization: Bearer <token>` header, with an `x-api-key` header accepted as an alternative for direct integrations
   - Routes MCP traffic to the `/mcp` endpoint over the Streamable HTTP transport
   - Runs statelessly with no Durable Object, so a fresh in-memory server is built per request and discarded when the request finishes

2. **Stateless MCP Handler**:
   - Built with `createMcpHandler` from the agents framework
   - Constructs an MCP server per request and registers all tools on it
   - Threads the caller's token into the tools for authenticated API calls

3. **Tool Registration** (`src/tools/registerTools.ts`):
   - Centralized registration of all 66 financial data tools
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
- `SECTORS_OAUTH_CLIENT_ID`: Upstream OAuth client ID, needed only for the OAuth flow
- `SECTORS_OAUTH_CLIENT_SECRET`: Upstream OAuth client secret, needed only for the OAuth flow
- `OAUTH_KV`: KV namespace binding used to store OAuth clients, sessions, and codes

### Streamable HTTP Transport

The server speaks the Streamable HTTP transport at `/mcp`. Each request carries a JSON-RPC message and receives its response inline, so there is no long-lived connection to maintain and no per-session state on the server. This keeps the Worker stateless and lets it scale cheaply.

Example client configuration:
```javascript
{
  transport: {
    type: 'http',
    url: 'https://sectors-mcp.supertype.ai/mcp',
    headers: {
      Authorization: `Bearer ${process.env.SECTORS_API_KEY}`,
    },
  },
}
```

## Usage Examples

### With Claude CLI (Recommended)

```bash
claude mcp add --transport http sectors https://sectors-mcp.supertype.ai/mcp \
  --header "Authorization: Bearer YOUR_API_KEY_HERE"
```

### With Claude Desktop (Manual Config)

Add to your configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "sectors": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://sectors-mcp.supertype.ai/mcp",
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

This uses `mcp-remote` to bridge the Streamable HTTP connection into stdio.

### With MCP Client (TypeScript/JavaScript)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({
  name: "sectors-client",
  version: "1.0.0"
});

const transport = new StreamableHTTPClientTransport(
  new URL("https://sectors-mcp.supertype.ai/mcp"),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${process.env.SECTORS_API_KEY}`
      }
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

3. Test the MCP endpoint with an `initialize` handshake, which is the first request any real client sends:
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0.0"}}}'
```

A healthy response streams back an `event: message` line whose data contains `serverInfo` with the server name and version. A follow-up `tools/list` call returns the full tool catalog.

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
- Bind the OAuth KV namespace
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

This server draws its data from a single source:

1. **Sectors API** (https://sectors.app/api)
   - Primary source for Indonesian (IDX) market data
   - Singapore (SGX) and Malaysia (KLSE) market data
   - Real-time and historical financial data
   - Requires an API key for authentication

## Dependencies

### Core Dependencies
- `@modelcontextprotocol/sdk`: MCP client and server primitives
- `@modelcontextprotocol/server` (v2): the stateless server used by `createMcpHandler`
- `agents`: provides `createMcpHandler` for the stateless Workers transport
- `zod` (v4): schema validation for tool inputs

### Development Dependencies
- `typescript`: TypeScript compiler
- `wrangler`: Cloudflare Workers CLI
- `@types/node`: Node.js type definitions

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

## Changelog

### August 2026: stateless transport and the move to `/mcp`

The server previously ran on a stateful MCP agent backed by a Cloudflare Durable Object, and it exposed the Server-Sent Events transport at `/sse`. Every SSE connection created a Durable Object instance, and each instance wrote to Durable Object storage, which steadily consumed the storage write allowance and eventually caused requests to fail.

The server now runs as a stateless Streamable HTTP handler at `/mcp`. It builds a fresh MCP server for each request and holds no per-session state, so there are no Durable Object writes. Alongside this change the tools moved to the v2 server API, the schema was refreshed, and the unused Supabase dependency was removed.

What this means for you:

- Point your client at `https://sectors-mcp.supertype.ai/mcp` and use the `http` (Streamable HTTP) transport. The examples above show the exact configuration for the Claude CLI, Claude Desktop, and the TypeScript SDK.
- Authentication is unchanged. Send your key as `Authorization: Bearer YOUR_API_KEY`, or as an `x-api-key` header for direct integrations.
- If you added Sectors with a `/sse` URL, update it to `/mcp`. In the Claude CLI you can remove the old entry and add it again with `--transport http` and the `/mcp` URL.

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
- [Model Context Protocol](https://modelcontextprotocol.io/)
