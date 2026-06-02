---
date: 2026-06-02
topic: mcp-v2-endpoint-parity
---

# Sectors MCP — v2 Endpoint Parity

## Problem Frame
The Sectors MCP server (Cloudflare Worker, SSE/MCP transport) exposes ~40 tools that call the Sectors API. The production API is now **v2** (`https://api.sectors.app/v2`) and the live docs in `sectors-docs/api-references/v2/` are the source of truth, declaring **44 `GET /v2/...` endpoints** with request params and response schemas.

The MCP's `SECTORS_API_BASE` already points at `/v2`, but tool paths were authored against v1 shapes. Result: some tools match v2, several have **drifted paths**, some hit **endpoints that no longer exist in v2**, and an entire **`mining/*` family (~16 endpoints)** plus other documented endpoints have **no MCP tool at all**. Users of the MCP cannot reach much of the production API, and some existing tools may be calling dead or changed routes.

Goal: bring the MCP to **full 1:1 parity** with the documented v2 API — every documented v2 endpoint exposed as a tool, every tool matching the documented path, params, and response shape, and no tool calling an undocumented/dead endpoint without verification.

## Requirements

### Coverage
- R1. Every documented `GET /v2/...` endpoint in `sectors-docs/api-references/v2/` has a corresponding MCP tool.
- R2. No MCP tool calls a path that is absent from the v2 docs **unless** it has been verified to work against the live production API (see R7).

### Correctness of existing tools
- R3. Each existing tool's request path matches its documented v2 path exactly (path template, trailing slashes, segment names).
- R4. Each existing tool's request parameters match the documented v2 params (names, required/optional, enums). Notably the **Companies Screener** (`/v2/companies/`) now uses a SQL-like interface (`where`, `order_by`, `q`, `limit`, `offset`) with pagination — tool params and descriptions must reflect this.
- R5. Each existing tool's TypeScript response interface matches the documented v2 response schema, including new envelope fields (e.g. `pagination`, `llm_translation` on the screener).

### New tools (documented but missing)
- R6. Add tools for documented v2 endpoints the MCP currently lacks. Known gaps:
  - Mining family (~16): commodities, commodity price, companies + detail/financials/ownership/performance, contracts, exports, global-commodity, license-auctions (+ detail), licenses, resources-reserves, sales-destination, sites, total-production.
  - Malaysia / KLSE: `klse/companies/`, `klse/companies/top/`, `klse/company/report/{ticker}/`, `klse/sectors/`.
  - Other: `filings/`, `tags/`, `subsector/report/{sub_sector}/`, `companies/top-growth/`.

### Verification of undocumented tools
- R7. For each existing tool whose endpoint is NOT in the v2 docs (e.g. `getCompaniesNipe`, `getSingaporeAdvancedMetrics`, dividend, historical-financial, NIPE, advanced-metrics), probe the live production API during planning to determine status, then per tool decide: keep (still works), fix (path/params changed), or remove (dead).
- R8. Removed/renamed endpoints that no longer exist in v2 (e.g. `/index/{index}/` used by `indexData`/`companiesByIndex`) are migrated to their v2 replacement or removed with a noted rationale.

### Conventions
- R9. New and updated tools follow the existing tool pattern in `AGENTS.md` (exported `fetchXxx` + `registerXxxTool`, Zod params with `.describe()`, typed `handleApiResponse<T>`, structured MCP error responses) and are wired into `registerTools.ts`.
- R10. `npm run type-check` passes after changes.

## Success Criteria
- A reconciliation table maps every v2 documented endpoint → MCP tool (status: matches / fixed / added / verified-keep / removed). No "documented but unmapped" rows remain.
- The Companies Screener tool accepts the v2 SQL-like params and returns the paginated envelope.
- No tool calls an endpoint that is neither in the v2 docs nor verified live.
- Type-check passes; tools register without errors.

## Scope Boundaries
- Not changing transport, OAuth/PKCE, or the double-proxy auth architecture.
- Not adding a test framework (none configured); verification is type-check + live probe + manual `npm run dev`.
- Not redesigning tool ergonomics beyond what parity requires (no renaming for taste, no new aggregation tools).
- Not touching the v1 doc tree — v2 is the contract.

## Key Decisions
- **Source of truth = v2 docs.** The `api: "GET /v2/..."` frontmatter + `<ResponseExample>` blocks in `sectors-docs/api-references/v2/` define paths, params, and response shapes.
- **Full parity, not just drift-fixing.** All 44 documented endpoints get tools; the mining family is the largest addition.
- **Verify undocumented tools against the live API** rather than blindly keeping or deleting.

## Dependencies / Assumptions
- A working `SECTORS_API_KEY` (Bearer token) is available to probe the live v2 API during planning/verification.
- The v2 docs are current and authoritative as of 2026-06-02.
- `SECTORS_API_BASE` stays `https://api.sectors.app/v2`; no per-tool version overrides needed.

## Outstanding Questions

### Resolve Before Planning
- (none — scope and source of truth are decided)

### Verified Against Live v2 API (2026-06-02)
Auth confirmed: `Authorization: <raw api key>` (no `Bearer` prefix for Sectors keys). Findings:
- `/v2/companies/` → **200** (works; SQL-like screener per R4).
- `/v2/companies/top/` → **404 and not in v2 docs.** The plain IDX "top companies" ranking endpoint is **removed** in v2. v2 ranking is only `companies/top-changes/`, `sgx/companies/top/`, `klse/companies/top/`. → MCP `topCompanies` / `topCompaniesByMetrics` / `topGrowth` (IDX) must be migrated or **removed** (R8).
- `/v2/index/economic30/` → **404.** Confirms `/index/{index}/` is dropped; `indexData` + `companiesByIndex` must migrate (likely to `index-daily/{index_code}/`) or be removed (R8).
- `/v2/free-float/` → **400** = alive but requires a filter param (`sector`/`sub_sector`/`industry`/`sub_industry`, kebab-case). Tool must require/validate one (R4).
- `/v2/mining/companies/`, `/v2/tags/`, `/v2/filings/` → **200** (confirmed live; build tools per R6).

### Deferred to Planning
- [Affects R7][Needs research] Probe the live v2 API for each remaining undocumented existing tool (NIPE, Singapore advanced metrics, dividends, historical financials, Singapore-specific reports/transactions) to classify keep/fix/remove. Several Singapore tools have no v2 doc entry — confirm whether SGX coverage in v2 is only the 4 documented `sgx/*` endpoints.
- [Affects R8][Technical] Confirm the v2 replacement (or removal) for the IDX top-companies ranking now that `/companies/top/` is 404 — is there a SQL-screener-based equivalent via `/companies/?order_by=...`?
- [Affects R4,R5][Technical] Extract exact param lists and response schemas per endpoint from each v2 `.mdx` (`<ResponseExample>`, `<ParamField>`) to drive Zod schemas and TS interfaces.
- [Affects R6][Technical] Confirm mining endpoint params (slug vs ticker, `{name}`, `{wiup_code}`, `{slug}`) and auth/quota behavior.

## Next Steps
→ `/ce:plan` for structured implementation planning (begin with the live-API verification pass and per-endpoint schema extraction).
