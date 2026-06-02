---
title: "feat: Sectors MCP v2 REST endpoint parity"
type: feat
status: completed
date: 2026-06-02
origin: docs/brainstorms/2026-06-02-mcp-v2-endpoint-parity-requirements.md
---

# feat: Sectors MCP v2 REST endpoint parity

## Overview

Bring the Sectors MCP server's **REST API tools** to 1:1 parity with the documented v2 production API (`https://api.sectors.app/v2`). This means: fix the REST tools whose paths/params drifted, remove or migrate REST tools that call endpoints which no longer exist in v2, and add REST tools for every documented v2 endpoint the MCP currently lacks (mining family, KLSE/Malaysia, filings, tags, news, REST subsector report).

> **Source of truth = `sectors-docs/schema.json`** (OpenAPI 3.0.3, `info.version: 2.0.0`), referenced by `mint.json` (`"openapi": "/schema.json"`) and by each v2 `.mdx` via `openapi: "GET /v2/..."` frontmatter. As of the docs pull on 2026-06-02 (HEAD `03b362b`), the v2 `.mdx` files **no longer carry per-file `api:`/`<ParamField>`/`<ResponseExample>`** — they all defer to the central OpenAPI spec. Use `schema.json` `paths` for exact paths, params, required flags, and defaults; use the `.mdx` prose only for allowed-value guidance (enum lists like `index_code`, `sections`, `classifications` live in prose, not the OpenAPI `enum` field). `schema.json` `components.schemas` define response shapes — derive TS interfaces from there.

**Supabase-backed tools are explicitly out of scope** and must not be touched (see origin + Key Technical Decisions). Only tools registered with the `(server, baseUrl, apiKey)` signature — the ones that call the REST API — are in scope.

## Problem Frame

The MCP's `SECTORS_API_BASE` already points at `/v2`, but REST tool paths were authored against v1 shapes. Live probing on 2026-06-02 confirmed:
- Some REST tools still match v2 and work.
- Two REST tools (`fetch-index`, `fetch-companies-by-index`) call `/index/{index}/`, which is **404 / removed** in v2.
- ~20 documented v2 REST endpoints have **no tool at all** — the entire mining family, all KLSE endpoints, filings, tags, news, and the REST subsector report.
- A **duplicate `fetch-sgx-company-report` tool id** is registered twice (`companies.ts` and `sgxCompanyReport.ts`); last registration wins.

Users of the MCP cannot reach much of the production API, two tools are broken, and one tool id collides. (see origin: docs/brainstorms/2026-06-02-mcp-v2-endpoint-parity-requirements.md)

## Requirements Trace

- R1. Every documented `GET /v2/...` REST endpoint has a corresponding MCP tool.
- R2. No REST tool calls a path absent from the v2 docs (the two dead `/index/{index}/` tools are migrated or removed).
- R3. Each existing REST tool's request path matches its documented v2 path exactly (template, trailing slashes, segments).
- R4. Each existing REST tool's request params match documented v2 params (names, required/optional, enums).
- R5. Each existing REST tool's TypeScript response interface matches the documented v2 response shape (incl. `results`+`pagination` envelopes).
- R6. New REST tools added for documented v2 endpoints the MCP lacks (mining ×18, KLSE ×4, filings, tags, news, REST subsector report).
- R9. New/updated tools follow the existing REST tool pattern in `AGENTS.md` and are wired into `registerTools.ts`.
- R10. `npm run type-check` passes after changes.

(R7/R8 from the origin collapse: every "undocumented existing tool" that probed 404 is **Supabase-backed and out of scope** — there are no orphaned REST tools to verify/remove except the two dead `/index/` tools handled under R2.)

## Scope Boundaries

- **Out of scope: all Supabase-backed tools** (`(server, env)` signature, querying `idx_company_report` / `sgx_company_report` / `idx_daily_data`). Do not remove, rename, or modify them — including `get-subsector-report`, `get-company-dividend`, `get-companies-nipe`, `get-companies-historical-financial`, every `get-singapore-*`, `calculate-singapore-*`, `get-top-companies-by-metrics`, `get-companies-report`, `get-daily-transaction`, `fetch-ipo-companies`.
- Not changing transport, OAuth/PKCE, or the double-proxy auth architecture.
- Not adding a test framework (none configured); verification = type-check + live probe + manual `npm run dev`.
- No tool renaming for taste; no new aggregation tools beyond documented endpoints.
- Not touching the v1 doc tree.
- News tool: expose the documented `/v2/news/` endpoint; this does not conflict with any Supabase tool.

## Context & Research

### Relevant Code and Patterns

- **REST tool pattern** (`AGENTS.md` "Tool Registration Pattern"): exported `fetchXxx(baseUrl, apiKey, params)` + `registerXxxTool(server, baseUrl, apiKey)`; Zod params with `.describe()`; `createApiHeaders(apiKey)` from `src/utils/api.ts`; `handleApiResponse<T>(response)` for typed parsing; structured MCP error responses (`isError: true`).
- **Auth header** (`src/utils/api.ts`): `Authorization: <raw key>` when the key matches the Sectors key shape, else `Bearer <key>`. Confirmed live: raw key works.
- **Existing clean REST examples to mirror:**
  - Simple no-param array: `src/tools/subsectors.ts`, `industries.ts`, `subindustries.ts`, `sgxSectors.ts`.
  - Path-param + query: `src/tools/indexDaily.ts`, `companyReport.ts`, `dailyTransaction.ts`.
  - Query-only with enums/defaults: `src/tools/mostTraded.ts`, `topMovers.ts`, `sgxTopCompanies.ts`.
  - `results`+`pagination` envelope: `fetch-top-companies` / `fetch-companies-by-subsector` in `src/tools/companies.ts` (screener) — mirror this for mining list endpoints.
- **Central registry:** `src/tools/registerTools.ts` — REST tools registered as `registerXxxTool(server, SECTORS_API_BASE, apiKey)`; Supabase tools as `registerXxxTool(server, env)`. Keep the two groups visually separated.
- **Shared types:** `src/types/api.ts`.

### Institutional Learnings

- Prior plan `docs/plans/2026-05-13-001-fix-v2-migration-breakage-plan.md` fixed 6 specific v2-migration tool failures (screener-based `top-companies`/`top-growth` migration landed there — which is why those two tools already correctly hit `/companies/?order_by=...`). This plan is the broader parity follow-up. Do not re-do the screener migration.

### Live Probe Results (2026-06-02, authoritative)

| Path | Status | Implication |
|---|---|---|
| `/v2/companies/` | 200 | screener works |
| `/v2/index/{index}/` (e.g. `lq45/`, `economic30/`) | 404 | DEAD — `fetch-index` + `fetch-companies-by-index` broken |
| `/v2/index-daily/{index_code}/` | 200 | live replacement for index data |
| `/v2/free-float/` | 400 w/o filter | alive; needs a filter param |
| `/v2/subsector/report/banks/` | 200 | REST subsector report live (R6) |
| `/v2/klse/sectors/`, `/v2/klse/companies/`, `/v2/klse/companies/top/` | 200 / 400-needs-sector / 200 | KLSE live (R6) |
| `/v2/mining/commodities/`, `/license-auctions/`, `/sites/`, `/resources-reserves/`, `/companies/` | 200 | mining live (R6) |
| `/v2/tags/`, `/v2/filings/` | 200 | live (R6) |
| `/v2/companies/dividend/...`, `/v2/nipe/`, `/v2/historical-financials/...`, `/v2/sgx/earnings-yield/`, `/v2/sgx/historical-volatility/`, `/v2/sgx/daily/...` | 404 | **all Supabase-backed tools — out of scope, expected 404** |

## Docs Pull Update (2026-06-02, HEAD `03b362b`)

The docs repo was pulled to latest before finalizing. The pull (37 commits) changed the docs in ways that affect this plan:

- **Source of truth moved to OpenAPI**: every v2 `.mdx` now uses `openapi: "GET /v2/..."` frontmatter pointing at the new `sectors-docs/schema.json` (OpenAPI 3.0.3). The old `api:`/`<ParamField>`/`<ResponseExample>` blocks are gone. **Use `schema.json` as authoritative.**
- **Path param renamed `{ticker}` → `{symbol}`** across all report/daily/listing/segments/quarterly endpoints (e.g. `/company/report/{symbol}/`, `/daily/{symbol}/`, `/sgx/company/report/{symbol}/`, `/klse/company/report/{symbol}/`). This is a docs-naming change; the URL is still a path segment, so existing tools that interpolate a ticker still work — but tool param descriptions should say "symbol".
- **`{name}` → `{commodity_name}`** for `/mining/commodities/{commodity_name}/price/`.
- **Bare report paths are duplicates, not new endpoints**: the spec lists both `/v2/company/report/` and `/v2/company/report/{symbol}/` (same for `klse`, `sgx`, `subsector/report`). Both declare the path param as required — they are the same handler documented twice. **One tool per report endpoint**, not two. (Removes a false "new endpoint" from earlier analysis.)
- **`/v2/index/{index}/` is absent from the OpenAPI spec entirely** — reinforces the Unit 3 removal decision.
- **Param precision corrections** (from `schema.json`):
  - Screener `/companies/` has a distinct **`desc`** param (default `False`) in addition to `order_by` (default `symbol`), plus `where, q, limit(50), offset(0), include_query_values(False)`.
  - `filings/` uses singular **`symbol`** (not `tickers`): `symbol, sector, sub_sector, start, end, limit(20), offset(0), transaction_type(buy|sell), tags`.
  - `news/` is richer: `sector, sub_sector, commodity_type, start, end, limit(20), offset(0), tags, extension(idx|mining, def idx), keyword, symbols`.
  - `mining/exports/` requires both `commodity_type*` and `year*`; `mining/total-production/` requires `commodity_type*`; `klse/companies/` and `sgx/companies/` require `sector*`.
- **Total documented GET endpoints in `schema.json`: 51 path entries → ~44 distinct tools** after collapsing the bare/`{symbol}` report duplicates.

Net effect on the plan: structure and unit breakdown are unchanged; the corrections are param-level precision and a source-of-truth swap to `schema.json`. Implementer should read `schema.json` `paths` + `components.schemas` per endpoint rather than scraping `.mdx`.

## Key Technical Decisions

- **Source of truth = `sectors-docs/schema.json`** (OpenAPI 3.0.3), validated against live probes. Paths, params, required flags, and defaults come from the spec; allowed enum values come from the `.mdx` prose; response shapes from `components.schemas`.
- **Supabase tools untouched.** The origin's "verify undocumented tools" applies only to REST tools; every undocumented tool that 404'd is Supabase-backed, so it is out of scope, not a removal candidate.
- **Dead `/index/{index}/` tools:** The v2 docs have NO `index/{index}/` endpoint. The closest documented capabilities are `index-daily/{index_code}/` (already covered by `fetch-index-daily`) and the screener (`/companies/?where=index_code...` if supported). Decision: **remove** `fetch-index` and `fetch-companies-by-index` rather than fabricate a mapping, since no documented v2 endpoint returns index membership/metadata. Recorded as an Open Question for confirmation before deletion.
- **Duplicate `fetch-sgx-company-report`:** keep the dedicated `sgxCompanyReport.ts` implementation (richer, formatted), remove the duplicate registration/definition in `companies.ts`.
- **Mining list endpoints** use `results`+`pagination` — mirror the screener envelope typing.
- **Two dual-endpoint docs** (`mining/sites.mdx`, `mining/resources-reserves.mdx`) each yield a list tool and a detail tool → 2 tools each.

## Open Questions

### Resolved During Planning

- Are the 404 "undocumented" tools drifted REST tools? **No** — confirmed Supabase-backed; out of scope.
- Do `top-companies`/`top-growth` need screener migration? **No** — already done in the 2026-05-13 plan.
- Is `/index/{index}/` recoverable? **No documented v2 equivalent** returns index membership; not the same as `index-daily`.

### Deferred to Implementation

- **Confirm removal of `fetch-index` + `fetch-companies-by-index`** vs. a screener-based reimplementation — verify during Unit 2 whether the screener `where` supports an index-membership filter. If it does, reimplement; otherwise remove. Decision must be made before deleting code.
- Exact valid `sector` slugs for `klse/companies/` (400 on guessed slug) — discover from `klse/sectors/` response at implementation time; not a blocker.
- Exact nested response field names for mining detail endpoints — `schema.json` `components.schemas` now provide these; derive TS interfaces from the spec and spot-check against live JSON. (Lower risk than before the docs pull.)
- Mining `commodity-price` default year window logic (current-year−2) — `Date` is fine in the Worker runtime; confirm desired default behavior.

## Implementation Units

Grouped into three phases: (1) fix/dedupe existing REST tools, (2) resolve the dead index tools, (3) add missing REST tools by family.

### Phase 1 — Fix & reconcile existing REST tools

- [ ] **Unit 1: Reconcile existing REST tool paths, params, and response types against v2 docs**

**Goal:** Bring all currently-working REST tools into exact v2 parity (R3, R4, R5) and fix display-text/path inconsistencies.

**Requirements:** R3, R4, R5, R10

**Dependencies:** None

**Files:**
- Modify: `src/tools/companies.ts` (fix `fetch-companies-with-segments` display text `/companies/with-segments/` → actual `/companies/list_companies_with_segments/`; verify `fetch-company-segments`, quarterly tools params)
- Modify: `src/tools/dailyTransaction.ts` (add trailing slash: `/daily/{ticker}` → `/daily/{ticker}/` per v2 doc)
- Modify: `src/tools/indexDaily.ts` (add `index_code` enum — values from the `.mdx` prose, not the OpenAPI `enum` field: `ftse, idx30, idxbumn20, idxesgl, idxg30, idxhidiv20, idxq30, idxv30, ihsg, jii70, kompas100, lq45, sminfra18, srikehati, sti, economic30, idxvesta28`)
- Modify: `src/tools/companies.ts` / `topCompanies.ts` (screener: add the `desc` param, default `false`, distinct from `order_by` default `symbol`, per `schema.json`)
- Modify: `src/tools/industries.ts`, `subindustries.ts`, `subsectors.ts`, `indexData.ts` (fix display text trailing-slash mismatches where present)
- Modify: `src/tools/freeFloat.ts` (params already match; confirm at least-one-filter guidance in description)
- Modify: `src/types/api.ts` (align response interfaces with documented shapes where they drift)

**Approach:**
- Walk each REST tool against the extracted v2 contract; correct path templates, param names, enums, and defaults to match.
- Fix the "printed URL vs fetched URL" mismatches so displayed paths are truthful.
- Update TS interfaces only where the documented shape differs from the current interface.

**Patterns to follow:** existing tool structure in each file; `handleApiResponse<T>`; `createApiHeaders`.

**Test scenarios (manual via `npm run dev` + live key):**
- `fetch-daily-transaction` with trailing slash returns 200 array of `{symbol,date,close,volume,market_cap}`.
- `fetch-index-daily` rejects an invalid `index_code` at the Zod layer; accepts `lq45`.
- `fetch-companies-with-segments` displayed URL matches the fetched URL.

**Verification:** `npm run type-check` passes; each touched tool returns documented shape against live API.

- [ ] **Unit 2: Remove duplicate `fetch-sgx-company-report` registration**

**Goal:** Eliminate the tool-id collision (R3 integrity).

**Requirements:** R3, R10

**Dependencies:** None

**Files:**
- Modify: `src/tools/companies.ts` (remove the `fetch-sgx-company-report` definition/export here)
- Modify: `src/tools/registerTools.ts` (ensure only `registerSGXCompanyReportTool` from `sgxCompanyReport.ts` is wired; remove the companies.ts SGX-report import/registration)

**Approach:** Keep `sgxCompanyReport.ts` (dedicated, formatted output). Delete the redundant SGX-report path in `companies.ts` and its registration. Confirm no other code imports the removed export.

**Patterns to follow:** `src/tools/sgxCompanyReport.ts`.

**Test scenarios:** Only one `fetch-sgx-company-report` registered; tool returns the dedicated implementation's output; `npm run dev` starts with no duplicate-registration warning.

**Verification:** `npm run type-check` passes; grep confirms a single registration.

### Phase 2 — Resolve dead index endpoints

- [ ] **Unit 3: Resolve `fetch-index` and `fetch-companies-by-index` (dead `/index/{index}/`)**

**Goal:** Remove or migrate the two tools calling the 404 `/index/{index}/` endpoint (R2).

**Requirements:** R2, R10

**Dependencies:** None

**Files:**
- Modify/Delete: `src/tools/indexData.ts`, `src/tools/companiesByIndex.ts`
- Modify: `src/tools/registerTools.ts` (remove imports + registrations if deleted)

**Approach:**
- First confirm the deferred question: does the screener (`/companies/?where=...`) support an index-membership filter that reproduces `fetch-companies-by-index`? Probe live during implementation.
- If yes: reimplement `fetch-companies-by-index` via the screener and keep it; otherwise remove both tools.
- `fetch-index` (index metadata) has no documented v2 replacement → remove.
- Document the removal rationale inline in `registerTools.ts` comments and in the reconciliation summary.

**Execution note:** Confirm the screener-filter probe result before deleting code; do not delete until the replacement question is settled.

**Patterns to follow:** screener usage in `src/tools/companies.ts` / `topCompanies.ts`.

**Test scenarios:** No tool calls `/index/{index}/`; if reimplemented, screener path returns 200; if removed, registry no longer references the tools.

**Verification:** `npm run type-check` passes; live probe shows no remaining `/index/{index}/` call.

### Phase 3 — Add missing documented REST tools (R6)

> All Phase 3 units follow the same REST tool pattern (`fetchXxx` + `registerXxxTool(server, baseUrl, apiKey)`), add a shared interface to `src/types/api.ts` (or a co-located interface), and wire registration into `registerTools.ts` under the REST group. Each is independent and can land as its own commit. Mirror the closest existing example noted per unit.

- [ ] **Unit 4: Indonesia helper/news REST tools — `tags`, `filings`, `news`**

**Goal:** Add `fetch-tags` (`/tags/`), `fetch-filings` (`/filings/`), `fetch-news` (`/news/`). (R1, R6)

**Requirements:** R1, R6, R9, R10

**Files:**
- Create: `src/tools/tags.ts`, `src/tools/filings.ts`, `src/tools/news.ts`
- Test: manual via `npm run dev`
- Modify: `src/tools/registerTools.ts`, `src/types/api.ts`

**Approach:**
- `tags`: no params, returns `string[]`.
- `filings` (per `schema.json`): optional `symbol` (singular, not `tickers`), `sector, sub_sector, tags, transaction_type(buy|sell), start, end, limit(default 20), offset(default 0)`; returns array of filing objects.
- `news` (per `schema.json`): `extension(idx|mining, default idx)`, `start, end, limit(default 20), offset(default 0)`, `sector, sub_sector, tags, symbols` (IDX), `keyword, commodity_type` (mining); returns `results`+`pagination`.

**Patterns to follow:** `subsectors.ts` (tags), `mostTraded.ts`/`topMovers.ts` (query params + enums), screener envelope for news pagination.

**Test scenarios:** `tags` returns alphabetical string array; `filings` with `transaction_type=buy` filters; `news` with `extension=mining` returns mining items; invalid enum rejected by Zod.

**Verification:** `npm run type-check` passes; each returns documented shape live.

- [ ] **Unit 5: REST subsector report — `fetch-subsector-report` (`/subsector/report/{sub_sector}/`)**

**Goal:** Add the REST subsector report tool. (R1, R6)

**Requirements:** R1, R6, R9, R10

**Files:**
- Create: `src/tools/subsectorReportRest.ts` (distinct filename to avoid colliding with the Supabase `subsectorReport.ts`)
- Modify: `src/tools/registerTools.ts`, `src/types/api.ts`

**Approach:** path param `sub_sector` (kebab-case); optional `sections` enum (`statistics, market_cap, stability, valuation, growth, companies`, default `all`); returns object with those section keys. **Use a new tool id distinct from the Supabase `get-subsector-report`** (e.g. `fetch-subsector-report`) so both coexist without collision.

**Execution note:** Verify the chosen tool id does not collide with `get-subsector-report` before registering.

**Patterns to follow:** `companyReport.ts` (path param + `sections` query, default `all`).

**Test scenarios:** `banks` returns 200 with documented section keys; `sections=valuation` narrows output; no id collision at registration.

**Verification:** `npm run type-check` passes; both subsector tools register.

- [ ] **Unit 6: Malaysia / KLSE REST tools (4)**

**Goal:** Add `klse/sectors/`, `klse/companies/` (required `sector`), `klse/companies/top/`, `klse/company/report/{ticker}/`. (R1, R6)

**Requirements:** R1, R6, R9, R10

**Files:**
- Create: `src/tools/klse.ts` (or one file per tool, matching repo granularity)
- Modify: `src/tools/registerTools.ts`, `src/types/api.ts`

**Approach:** mirror the existing SGX tools (`sgxSectors.ts`, `companies.ts` SGX-by-sector, `sgxTopCompanies.ts`, `sgxCompanyReport.ts`) — KLSE is structurally identical. `klse/companies/` requires `sector` (kebab-case). `klse/companies/top/`: optional `sector(default all)`, `classifications(enum dividend_yield,revenue,earnings,market_cap,pe; default all)`, `min_mcap_million(default 1000, MYR)`. Report ticker is 4-digit numeric.

**Patterns to follow:** the SGX tool family (near 1:1 analog).

**Test scenarios:** `klse/sectors/` returns slug array; `klse/companies/` with a valid sector slug (from sectors response) returns 200; `klse/companies/top/` returns classification-keyed object; report with a 4-digit ticker returns documented shape.

**Verification:** `npm run type-check` passes; all 4 return documented shapes live.

- [ ] **Unit 7: Mining — commodities-trade REST tools (5)**

**Goal:** `mining/commodities/`, `mining/commodities/{name}/price/`, `mining/exports/` (required `year`+`commodity_type`), `mining/global-commodity/`, `mining/contracts/`. (R1, R6)

**Requirements:** R1, R6, R9, R10

**Files:**
- Create: `src/tools/miningCommodities.ts`
- Modify: `src/tools/registerTools.ts`, `src/types/api.ts`

**Approach:** straightforward array responses except handle required params on `exports` (`year` int required, `commodity_type` required, `limit` max30) and `commodities/{name}/price/` (`start_year`/`end_year` default current−2/current, max 3-yr range). Mirror query+path patterns.

**Patterns to follow:** `indexDaily.ts` (path+date-range query), `mostTraded.ts` (defaults).

**Test scenarios:** `commodities` returns array; `exports` rejects missing `year`/`commodity_type` at Zod layer; `commodities/{name}/price/` respects year window.

**Verification:** `npm run type-check`; live 200s with documented shapes.

- [ ] **Unit 8: Mining — companies REST tools (5)**

**Goal:** `mining/companies/` (list, `results`+`pagination`), `mining/companies/{slug}/`, `mining/companies/financials/{slug}/`, `mining/companies/ownership/{slug}/`, `mining/companies/performance/{slug}/`. (R1, R6)

**Requirements:** R1, R6, R9, R10

**Files:**
- Create: `src/tools/miningCompanies.ts`
- Modify: `src/tools/registerTools.ts`, `src/types/api.ts`

**Approach:** list endpoint: optional `keyword, commodity_type, company_type(enum Mine Owner,Contractor,Holding,Manufacturer,Trader,Consultant), has_financials, limit(max30), offset` → envelope. Detail/financials/ownership/performance are `slug`-path; financials/performance take optional `year`; performance takes optional `commodity_type`. Capture exact nested response keys from live JSON into interfaces.

**Patterns to follow:** screener envelope (list), `companyReport.ts` (path-param detail).

**Test scenarios:** list paginates via `limit`/`offset`; detail by slug returns single object; financials defaults to latest year and exposes `available_years`.

**Verification:** `npm run type-check`; live 200s.

- [ ] **Unit 9: Mining — licenses, auctions, sales, sites, production, resources-reserves REST tools (8)**

**Goal:** `mining/licenses/`, `mining/license-auctions/`, `mining/license-auctions/{wiup_code}/`, `mining/sales-destination/{slug}/`, `mining/sites/` (list), `mining/sites/{slug}/` (detail), `mining/total-production/` (required `commodity_type`), `mining/resources-reserves/` (index), `mining/resources-reserves/{province}/` (detail). (R1, R6)

**Requirements:** R1, R6, R9, R10

**Files:**
- Create: `src/tools/miningLicenses.ts`, `src/tools/miningSites.ts` (split by theme to keep files readable)
- Modify: `src/tools/registerTools.ts`, `src/types/api.ts`

**Approach:** list endpoints use `results`+`pagination` with filter params + `order_by` enums per doc (licenses, auctions, sites). Detail endpoints are path-param (`wiup_code`, `slug`, `province`). `total-production` requires `commodity_type`. The two dual-endpoint docs each produce a list/index tool AND a detail tool (9 tools total in this unit).

**Patterns to follow:** screener envelope (lists), `companyReport.ts` (detail), `mostTraded.ts` (filter defaults + `order_by`).

**Test scenarios:** auctions list paginates and respects `order_by`; auction detail by `wiup_code`; `total-production` rejects missing `commodity_type`; resources-reserves index vs `{province}` detail return their distinct shapes.

**Verification:** `npm run type-check`; live 200s with documented shapes.

- [ ] **Unit 10: Final reconciliation + registry audit**

**Goal:** Produce the success-criteria reconciliation table and confirm full parity (success criteria, R1, R10).

**Requirements:** R1, R2, R10

**Dependencies:** Units 1–9

**Files:**
- Modify: `src/tools/registerTools.ts` (final ordering/comments separating REST vs Supabase groups)
- Create/Update: a short reconciliation table in the plan or a `docs/` note mapping every v2 doc endpoint → tool id → status (matches/fixed/added/removed).

**Approach:** Diff the registered REST tool ids against the full v2 doc endpoint list. Confirm zero "documented but unmapped" REST endpoints and zero REST tools calling undocumented/dead paths. Confirm no Supabase tool was modified.

**Test scenarios:** registry count = (existing REST tools − removed) + new REST tools; every v2 doc endpoint has a row; `npm run dev` starts cleanly with no duplicate ids.

**Verification:** `npm run type-check` passes; reconciliation table complete; Supabase tools byte-for-byte unchanged (git diff scoped to REST files).

## System-Wide Impact

- **Interaction graph:** all new/changed tools flow through `registerAllTools` in `registerTools.ts`; the REST group uses `(server, SECTORS_API_BASE, apiKey)`. Keep REST and Supabase registration blocks separated to avoid accidental signature mixups.
- **Tool-id namespace:** new tool ids must not collide with existing ones — special care for subsector report (`fetch-subsector-report` vs Supabase `get-subsector-report`) and the SGX-report dedupe.
- **Error propagation:** all REST tools must return structured MCP errors (`isError: true`) via the existing pattern; 400s (e.g. free-float without filter, klse without valid sector) should surface the API message, not crash.
- **Response envelopes:** list endpoints returning `results`+`pagination` need interfaces that preserve pagination so clients can page; do not flatten.
- **Integration coverage:** no automated tests exist — parity is proven by live probes + `npm run dev`; the reconciliation table (Unit 10) is the durable coverage artifact.

## Risks & Dependencies

- **Risk: deleting `fetch-index`/`fetch-companies-by-index` could remove functionality some client relies on.** Mitigation: confirm no documented/screener replacement first (Unit 3 deferred question); document rationale.
- **Risk: mining response shapes are nested.** Mitigation: `schema.json` `components.schemas` now document them; derive interfaces from the spec and spot-check live during Units 8–9.
- **Risk: tool-id collision with Supabase tools.** Mitigation: explicit id checks in Units 5 and 2.
- **Dependency: live API key** for probing/verification (provided; `Authorization: <raw key>`).
- **Dependency: valid slugs** (KLSE sectors, mining commodity_type) discovered from helper endpoints at implementation time.

## Documentation / Operational Notes

- Update `AGENTS.md` tool count ("40+ tools") after the net change if desired (optional, non-blocking).
- No rollout/migration concerns — additive tools + two removals; no schema or auth changes.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-06-02-mcp-v2-endpoint-parity-requirements.md](docs/brainstorms/2026-06-02-mcp-v2-endpoint-parity-requirements.md)
- **v2 API contract (authoritative):** `sectors-docs/schema.json` (OpenAPI 3.0.3, version 2.0.0) — `paths` for routes/params, `components.schemas` for response shapes. Pulled to HEAD `03b362b` on 2026-06-02.
- v2 `.mdx` prose: `sectors-docs/api-references/v2/**/*.mdx` (allowed-value/enum guidance only; defers to `schema.json` via `openapi:` frontmatter)
- REST tool pattern: `sectors-mcp/AGENTS.md`, `src/utils/api.ts`, `src/tools/registerTools.ts`
- Prior related plan: `docs/plans/2026-05-13-001-fix-v2-migration-breakage-plan.md` (screener migration already done)
- Live probes performed 2026-06-02 against `https://api.sectors.app/v2`

## Final Reconciliation (Unit 10)

Every v2 GET path in `schema.json` (51 paths) maps to a registered REST tool. Zero unmapped paths; zero dead REST paths remain. The 16 Supabase-backed tool registrations (`(server, env)` signature) were left untouched per scope. Verified via `npm run type-check` (clean) and live probing.

> Note: `schema.json` documents some handlers under two paths (bare + `{symbol}`/`{sub_sector}` variants) — `company/report`, `klse/company/report`, `sgx/company/report`, `subsector/report`. These are the same handler, so one tool covers both rows.

| v2 GET path | REST tool id | Status |
|---|---|---|
| `/companies/` | `fetch-companies-by-subsector`, `fetch-companies-by-subindustry`, `fetch-top-companies`, `fetch-top-growth-companies` (screener) | OK |
| `/companies/list_companies_with_segments/` | `fetch-companies-with-segments` | OK (path fixed, Unit 1) |
| `/companies/top-changes/` | `fetch-top-company-movers` | OK |
| `/company/get-segments/{symbol}/` | `fetch-company-segments` | OK |
| `/company/get_quarterly_financial_dates/{symbol}/` | `fetch-quarterly-financial-dates` | OK |
| `/company/report/` + `/company/report/{symbol}/` | `fetch-company-report` | OK |
| `/daily/{symbol}/` | `fetch-daily-transaction` | OK (trailing slash fixed, Unit 1) |
| `/filings/` | `fetch-filings` | Added (Unit 4) |
| `/financials/quarterly/{symbol}/` | `fetch-quarterly-financials` | OK |
| `/free-float/` | `fetch-free-float` | OK |
| `/idx-total/` | `fetch-idx-market-cap` | OK |
| `/index-daily/{index_code}/` | `fetch-index-daily` | OK (enum added, Unit 1) |
| `/industries/` | `fetch-industries` | OK |
| `/klse/companies/` | `fetch-klse-companies-by-sector` | Added (Unit 6) |
| `/klse/companies/top/` | `fetch-klse-top-companies` | Added (Unit 6) |
| `/klse/company/report/` + `/klse/company/report/{symbol}/` | `fetch-klse-company-report` | Added (Unit 6) |
| `/klse/sectors/` | `fetch-klse-sectors` | Added (Unit 6) |
| `/listing-performance/{symbol}/` | `fetch-listing-performance` | OK |
| `/mining/commodities/` | `fetch-mining-commodities` | Added (Unit 7) |
| `/mining/commodities/{commodity_name}/price/` | `fetch-mining-commodity-price` | Added (Unit 7) |
| `/mining/companies/` | `fetch-mining-companies` | Added (Unit 8) |
| `/mining/companies/financials/{slug}/` | `fetch-mining-company-financials` | Added (Unit 8) |
| `/mining/companies/ownership/{slug}/` | `fetch-mining-company-ownership` | Added (Unit 8) |
| `/mining/companies/performance/{slug}/` | `fetch-mining-company-performance` | Added (Unit 8) |
| `/mining/companies/{slug}/` | `fetch-mining-company-detail` | Added (Unit 8) |
| `/mining/contracts/` | `fetch-mining-contracts` | Added (Unit 7) |
| `/mining/exports/` | `fetch-mining-exports` | Added (Unit 7) |
| `/mining/global-commodity/` | `fetch-mining-global-commodity` | Added (Unit 7) |
| `/mining/license-auctions/` | `fetch-mining-license-auctions` | Added (Unit 9) |
| `/mining/license-auctions/{wiup_code}/` | `fetch-mining-license-auction-detail` | Added (Unit 9) |
| `/mining/licenses/` | `fetch-mining-licenses` | Added (Unit 9) |
| `/mining/resources-reserves/` | `fetch-mining-resources-reserves` | Added (Unit 9) |
| `/mining/resources-reserves/{province}/` | `fetch-mining-resources-reserves-detail` | Added (Unit 9) |
| `/mining/sales-destination/{slug}/` | `fetch-mining-sales-destination` | Added (Unit 9) |
| `/mining/sites/` | `fetch-mining-sites` | Added (Unit 9) |
| `/mining/sites/{slug}/` | `fetch-mining-site-detail` | Added (Unit 9) |
| `/mining/total-production/` | `fetch-mining-total-production` | Added (Unit 9) |
| `/most-traded/` | `fetch-most-traded-stocks` | OK |
| `/news/` | `fetch-news` | Added (Unit 4) |
| `/sgx/companies/` | `fetch-sgx-companies-by-sector` | OK |
| `/sgx/companies/top/` | `fetch-sgx-top-companies` | OK |
| `/sgx/company/report/` + `/sgx/company/report/{symbol}/` | `fetch-sgx-company-report` | OK (duplicate registration removed, Unit 2) |
| `/sgx/sectors/` | `fetch-sgx-sectors` | OK |
| `/subindustries/` | `fetch-subindustries` | OK |
| `/subsector/report/` + `/subsector/report/{sub_sector}/` | `fetch-subsector-report` | Added (Unit 5) |
| `/subsectors/` | `get-subsectors` | OK |
| `/tags/` | `fetch-tags` | Added (Unit 4) |

**Removed (dead in v2, Unit 3):** `fetch-index` and `fetch-companies-by-index` (called `/index/{index}/`, 404 + absent from spec, no screener replacement). Source files `indexData.ts` and `companiesByIndex.ts` deleted.

**Out of scope (unchanged, Supabase-backed):** `fetch-ipo-companies`, `get-companies-historical-financial`, `get-companies-report`, `get-daily-transaction`, `get-company-dividend`, `get-company-financial`, `get-subsector-report`, `get-top-companies-by-metrics`, `get-singapore-company-historical-financial`, `get-singapore-companies-report`, `get-singapore-daily-transaction`, `get-singapore-company-dividend`, `get-singapore-top-companies-by-metrics`, `calculate-singapore-earnings-yield`, `calculate-singapore-historical-volatility`, `get-companies-nipe`.
