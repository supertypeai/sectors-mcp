# Sectors MCP Server

A Model Context Protocol (MCP) server that provides financial market data and analysis tools, with a focus on stock market sectors, indices, and company data. This server offers a comprehensive set of tools for accessing and analyzing financial market information.

## Features

- **Market Indices Data**: Access to various stock market indices and their historical data
- **Company Information**: Detailed company reports, financials, and performance metrics
- **Sector & Industry Analysis**: Tools for analyzing companies by sector, subsector, and industry
- **SGX (Singapore Exchange) Data**: Specialized tools for Singapore Exchange listed companies
- **Market Analysis**: Tools for identifying top movers, most traded stocks, and growth companies
- **Financial Reporting**: Access to quarterly financials and reporting dates

## Installation

1. Ensure you have Node.js (v14 or later) and npm installed
2. Clone this repository
3. Install dependencies:

```bash
npm install
```

4. Build the project:

```bash
npm run build
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
SECTORS_API_BASE=your_api_base_url
SECTORS_API_KEY=your_api_key
```

## Available Tools

### Market Indices

- `fetch-index`: Fetch data for a specific market index
- `fetch-index-daily`: Get daily transaction data for an index
- `fetch-idx-market-cap`: Retrieve historical market capitalization data

### Company Data

- `fetch-company-report`: Get detailed company reports
- `fetch-company-segments`: Access company segment data
- `fetch-listing-performance`: View listing performance metrics
- `fetch-quarterly-financials`: Access quarterly financial statements
- `fetch-quarterly-financial-dates`: Get reporting dates for financials
- `fetch-sgx-company-report`: Specialized reports for SGX-listed companies

### Sector & Industry Analysis

- `get-subsectors`: List all available subsectors
- `fetch-subindustries`: Get subindustry data
- `fetch-industries`: Access industry information
- `fetch-companies-by-subsector`: Find companies by subsector
- `fetch-companies-by-subindustry`: Find companies by subindustry
- `fetch-companies-by-index`: Get companies listed in a specific index
- `fetch-sgx-companies-by-sector`: Find SGX-listed companies by sector

### Market Analysis

- `fetch-top-companies`: Get top companies by various metrics
- `fetch-top-company-movers`: Identify top gaining and losing stocks
- `fetch-top-growth-companies`: Find companies with highest growth metrics
- `fetch-most-traded-stocks`: Get most actively traded stocks

## Usage

### Running the Server

```bash
node build/index.js
```

### Using with MCP Client

The server implements the Model Context Protocol, allowing it to be used with any MCP-compatible client. Example usage with an MCP client:

```javascript
// Example client code
const client = new McpClient({
  transport: new StdioTransport({
    command: "node",
    args: ["build/index.js"],
  }),
});

// Connect to the server
await client.connect();

// Use available tools
const result = await client.callTool("fetch-company-report", {
  ticker: "BBCA",
  sections: "overview,financials",
});
```

## Development

### Project Structure

- `src/` - Source code
  - `tools/` - Individual tool implementations
  - `types/` - TypeScript type definitions
  - `utils/` - Utility functions
  - `config.ts` - Configuration settings
  - `index.ts` - Main server entry point
- `build/` - Compiled JavaScript output
- `tsconfig.json` - TypeScript configuration

### Adding New Tools

1. Create a new file in `src/tools/` for your tool
2. Implement the tool following the pattern of existing tools
3. Register the tool in `src/tools/registerTools.ts`
4. Rebuild the project

## Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `zod`: Schema validation
- `typescript`: TypeScript compiler
- `@types/node`: TypeScript definitions for Node.js

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
