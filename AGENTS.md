# AGENTS.md - Sectors MCP Server

## Project Overview
TypeScript Cloudflare Worker implementing a Model Context Protocol (MCP) server for financial market data APIs. Provides 40+ tools for IDX (Indonesia) and SGX (Singapore) stock market data via SSE transport.

## Build Commands

```bash
# Development
npm run dev                    # Start local dev server (wrangler dev)

# Building
npm run build                  # Compile TypeScript + make executable
npm run type-check            # Type check without emitting
npm run cf-typegen            # Generate Cloudflare Worker types

# Deployment
npm run deploy                # Deploy to Cloudflare Workers
```

## Test Commands

No test framework is currently configured. When adding tests:

```bash
# Recommended: Add Vitest for testing
npm install -D vitest @vitest/ui

# Then use these commands:
npm test                      # Run all tests
npm run test:ui               # Run with UI
npx vitest run src/tools/freeFloat.test.ts     # Run single test file
npx vitest run -t "test name"                   # Run specific test
```

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2021 with ES2022 modules
- **Strict mode**: Enabled (strict: true in tsconfig.json)
- **Module resolution**: bundler
- **File extensions**: Use `.js` for imports (e.g., `import { foo } from "./bar.js"`)

### Naming Conventions
- **Files**: camelCase (e.g., `freeFloat.ts`, `registerTools.ts`)
- **Interfaces/Types**: PascalCase with descriptive names (e.g., `FreeFloatEntry`, `ApiConfig`)
- **Functions**: camelCase, verbs for actions (e.g., `fetchFreeFloat`, `registerTool`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `SECTORS_API_BASE`)
- **Variables**: camelCase (e.g., `apiKey`, `baseUrl`)

### Import Order
1. External dependencies (e.g., `import { McpServer } from "@modelcontextprotocol/sdk"`)
2. Internal absolute imports
3. Relative imports with `.js` extension (required for ES modules)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SECTORS_API_BASE } from "../config.js";
import { createApiHeaders } from "../utils/api.js";
```

### Tool Registration Pattern
Each tool follows this structure:

```typescript
// 1. Export async data fetcher
export async function fetchXxx(
  baseUrl: string,
  apiKey: string | undefined,
  params: { param1: string }
): Promise<ReturnType> {
  if (!apiKey) throw new Error("API key is not defined");
  // Implementation
}

// 2. Export tool registration function
export function registerXxxTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "tool-name-kebab-case",
    "Description of what this tool does",
    {
      param1: z.string().describe("Parameter description"),
    },
    async ({ param1 }) => {
      try {
        const result = await fetchXxx(baseUrl, apiKey, { param1 });
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : "An unknown error occurred";
        return {
          content: [{ type: "text" as const, text: errorMessage }],
          isError: true,
        };
      }
    }
  );
}
```

### Error Handling
- Always use typed errors: `catch (error: unknown)`
- Check error type before accessing properties
- Return structured error responses for MCP tools
- Use optional chaining and nullish coalescing: `authHeader?.startsWith("Bearer ")`

### Schema Validation
- Use Zod for all tool parameters
- Add `.describe()` to every parameter for documentation
- Use `.optional()` for optional fields
- Validate enums with `z.enum()`

### Type Safety
- Define interfaces for all API responses
- Use generics for reusable functions: `handleApiResponse<T>`
- Avoid `any` - use `unknown` and type guards
- Return types should be explicit on exported functions

### Formatting
- No Prettier/ESLint configured - follow existing patterns
- 2-space indentation
- Semicolons required
- Trailing commas in multi-line objects
- Max line length: ~100 characters

### File Organization
```
src/
├── index.ts              # Worker entry + routing
├── config.ts             # Environment variables + constants
├── lib/
│   └── supabaseClient.ts # Client initialization
├── tools/
│   ├── registerTools.ts  # Central tool registry
│   └── *.ts              # Individual tool implementations
├── types/
│   └── api.ts            # Shared interfaces
└── utils/
    └── api.ts            # API helpers (headers, response handling)
```

### API Integration Pattern
```typescript
// 1. Build URL with search params
const url = new URL(`${baseUrl}/endpoint/`);
if (param) url.searchParams.append("key", param);

// 2. Create headers
const headers = createApiHeaders(apiKey);

// 3. Fetch with error handling
const response = await fetch(url.toString(), { headers });
return handleApiResponse<ReturnType>(response);
```

### Environment Variables
Access via `env` parameter passed through tool registration, NOT via `process.env`:

```typescript
// ❌ Don't do this in tools
const apiKey = process.env.SECTORS_API_KEY;

// ✅ Do this - receive from env parameter
export function registerTool(server: McpServer, env: any) {
  const apiKey = env.SECTORS_API_KEY;
}
```

## Cloudflare Workers Specifics

- **Runtime**: Cloudflare Workers with Durable Objects
- **Entry**: `src/index.ts` exports a fetch handler
- **SSE Endpoints**: `/sse` and `/sse/message`
- **MCP Endpoint**: `/mcp`
- **Authentication**: Bearer token in Authorization header
- **Durable Object Class**: `MyMCP` extends `McpAgent`

## Adding New Tools

1. Create tool file in `src/tools/myNewTool.ts`
2. Export `fetchXxx` data function and `registerXxxTool` registration function
3. Import and register in `src/tools/registerTools.ts`
4. Run `npm run type-check` to verify
5. Test with `npm run dev` locally

## Dependencies

- `@modelcontextprotocol/sdk`: MCP server implementation
- `agents`: MCP agent framework with Durable Objects
- `zod`: Schema validation
- `@supabase/supabase-js`: Database client
- `wrangler`: Cloudflare Workers CLI

## OAuth Implementation Learnings

### PKCE Implementation
- Use `crypto.getRandomValues()` for generating code verifiers
- Use `crypto.subtle.digest("SHA-256", data)` for code challenges
- Always implement timing-safe string comparison for PKCE verification to prevent timing attacks
- Base64url encoding replaces `+` with `-`, `/` with `_`, and removes padding `=`

### Double-Proxy Architecture
- Worker acts as OAuth Authorization Server to MCP clients
- Worker acts as OAuth Client to upstream `api.sectors.app`
- Only the Worker is registered on upstream; all MCP clients register dynamically
- KV storage uses TTL-based expiration for sessions (10 min) and codes (10 min)

### Key Naming Conventions for KV
- `client:${clientId}` - OAuth client registrations (no TTL)
- `session:${sessionId}` - Authorization sessions (TTL: 600s)
- `code:${authorizationCode}` - Code-to-token mappings (TTL: 600s)

## No Existing Cursor/Copilot Rules

No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files found.
