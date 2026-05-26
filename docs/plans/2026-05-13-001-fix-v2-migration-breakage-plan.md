---
title: "fix: Resolve v2-migration breakage across 6 tool failures"
type: fix
status: active
date: 2026-05-13
origin: docs/brainstorms/2026-05-13-v1-to-v2-api-migration-requirements.md
---

# fix: Resolve v2-migration breakage across 6 tool failures

## Overview

The v1→v2 base-URL flip (commit `86123a0`) closed R1–R4 of the migration brainstorm but exposed the deferred "byte-identical response shapes?" question. Six tools now error in production-style usage. This plan addresses each failure with a minimal, code-grounded fix, plus a parity audit on three other representative endpoints, plus deployment verification of `SECTORS_API_BASE`. Scope is bug repair only — no refactors, no new abstractions.

## Problem Frame

A user-supplied screenshot enumerates six broken tools (with sample errors). Live curl against `api.sectors.app` confirmed:

| # | Tool | Reported error | Confirmed cause |
|---|---|---|---|
| 1 | `fetch-companies-by-subindustry` | `Bad Request` | v2 `/companies/` no longer accepts `?sub_industry=` (returns `UNSUPPORTED_PARAMETERS: sub_industry`); v1 path still returns "The requested sub_industry does not exist" for `conventional-banks`. The legacy endpoint is gone; v2 only exposes the SQL screener `?where=sub_industry='...'`. |
| 2 | `fetch-sgx-companies-by-sector` | `v1_discontinued` (HTTP 410 with sunset payload from `/v1/sgx/companies/`) | Code path is correct (`${baseUrl}/sgx/companies/?sector=...`) and `/v2/sgx/companies/?sector=financial-services` returns HTTP 200. The 410 implies the **deployed worker is still resolving `SECTORS_API_BASE` to `/v1`** — i.e. the brainstorm's deferred deploy-env question never got answered. |
| 3 | `fetch-sgx-company-report` | `Not Found` for D05/DBS | `src/tools/sgxCompanyReport.ts:81` and the dead duplicate in `src/tools/companies.ts:612` both call `new URL('/sgx/company/report/${ticker}', baseUrl)`. WHATWG URL resolution treats `/sgx/...` as absolute and **strips the `/v2` from base**, hitting `https://api.sectors.app/sgx/company/report/D05` → 301 → effective 404. Direct curl to `/v2/sgx/company/report/D05/` returns 200. |
| 4 | `get-subsector-report` | "No companies found in subsector: banks" | `src/tools/subsectorReport.ts:87` matches `idx_company_report.sub_sector .eq(subsector)` with the raw user input. User passes kebab "banks"; the column stores the display form. Need a slug→display lookup. |
| 5 | `get-company-dividend` | `data.historical_dividends.find is not a function` | `src/tools/getCompanyDividend.ts:45` casts `historical_dividends` to `YearlyDividend[]` and calls `.find` unconditionally. Some rows store the field as an object/string/null. No `Array.isArray` guard. |
| 6 | `calculate-singapore-historical-volatility` | "can't get price data even when daily-transaction returns data" | `src/tools/getSingaporeAdvancedMetrics.ts:96-123` selects `all_time_price` from `sgx_company_report` and indexes into `90_d_high.price`. The live SGX-report shape (verified via API: `{"90_d_high": {"2026-05-12": 59.099998}}`) is a date→price object — there is no `.price` field. Tool reads the wrong shape; the working daily-transaction tool reads `close` JSON instead. |

Deployment verification of `SECTORS_API_BASE` is the gating uncertainty for #2 — the code may already be correct. The migration brainstorm's "Deferred to Planning" section flagged exactly this.

## Requirements Trace

- **R1.** All six reported tools return successful responses against the live v2 API for representative inputs (BBCA, banks, D05, conventional-banks).
- **R2.** Inherits brainstorm R1–R4 (single `/v2` base, no `/v1/` literals, no compat shim).
- **R3.** Parity audit: spot-check `fetch-company-report`, `fetch-quarterly-financials`, `fetch-top-companies` for v2 shape drift (brainstorm's deferred Q). Record findings; fix only if broken.
- **R4.** Deployed worker (`sectors-mcp.aidityasadhakim250.workers.dev`) actually serves the v2 build with `SECTORS_API_BASE=https://api.sectors.app/v2` — confirm via Wrangler secrets list or a probe tool call after deploy.

## Scope Boundaries

- No new tool features. No response-format restructuring. No telemetry, retry, or backoff additions.
- No OAuth, Supabase RLS, or Durable Object changes.
- The volatility tool's algorithm stays "based on price range" — not switching to log-return stdev. If the implementer finds the existing high/low estimate fundamentally misleading, surface it as a follow-up, don't expand scope here.
- Not adding tests scaffolding — this repo has none. Verification is curl-against-deployed-worker plus a manual MCP-client smoke list. Adding a test framework is a separate plan.
- Not removing console-log secret leakage, the duplicate `registerSGXCompanyReportTool`, or the stale `src/utils/api.js` — user chose "All 6 + parity audit", explicitly opting out of the security cleanup option. Recorded as deferred follow-up.

## Context & Research

### Relevant Code and Patterns

- **URL composition convention** (correct pattern, used by ~25 tools): template-string concatenation: `` `${baseUrl}/path/${param}/` `` — see `src/tools/companies.ts:169`, `src/tools/subsectors.ts:13`, `src/tools/sgxSectors.ts:19`. The two `new URL(absolutePath, baseUrl)` usages in `companies.ts:612` and `sgxCompanyReport.ts:81` are the outliers and the source of bug #3.
- **Supabase eq-filter on sub_sector** (analogous pattern): `src/tools/getIpoCompanies.ts:52`, `src/tools/topCompaniesByMetrics.ts:54`, `src/tools/freeFloat.ts:29`. These pass user input directly to `.eq("sub_sector", …)`. If the column stores Title-case, the same latent bug exists in those tools — flag as follow-up.
- **Array guard pattern** (no existing example): the codebase has no defensive `Array.isArray` guards on Supabase JSON columns. Adding one in `getCompanyDividend.ts` sets the pattern; do not retrofit elsewhere in this plan.
- **Centralized slug normalization** precedent: `src/utils/tickers.ts` (`normalizeIdxTicker`) — adding a `src/utils/subsectors.ts` with `kebabToDisplay` mirrors that single-purpose util style.
- **v2 screener envelope**: `/v2/companies/?where=...` returns `{results: [...], pagination: {...}}`, not a bare array. `fetchCompaniesBySubindustry` and `fetchCompaniesBySubsector` callers currently expect a bare array (`CompanyResponse[]`). The MCP response wrapper just JSON-stringifies whatever comes back — so the envelope passes through to the LLM client. Acceptable for a fix; flag if downstream consumers parse the array shape.

### Institutional Learnings

- `docs/brainstorms/2026-05-13-v1-to-v2-api-migration-requirements.md` — explicitly defers "Are v2 response shapes byte-identical to v1?" and "Does any deployed secret override `SECTORS_API_BASE` with /v1?" This plan answers both.
- No `docs/solutions/` directory exists. No prior bug postmortems to cross-reference.

### External References

- Sectors API v2 OpenAPI fragments supplied inline by user for `/v2/sgx/company/report/{ticker}/`, `/v2/sgx/sectors/`, `/v2/subindustries/`.
- Context7 `/supertypeai/sectors_api_docs` returned v1-era docs; **the docs site has not been updated for v2 in places**. Live curl is the authoritative source — Context7 results were used only for v2 screener `?where=` semantics.
- Live API probes (recorded during planning):
  - `GET /v2/companies/?where=sub_industry='banks'&limit=3` → 200, 48 results.
  - `GET /v2/companies/?sub_industry=conventional-banks` → 400 `UNSUPPORTED_PARAMETERS`.
  - `GET /v2/sgx/company/report/D05/` → 200; `all_time_price.90_d_high` shape = `{"YYYY-MM-DD": price}`.
  - `GET /v2/sgx/companies/?sector=financial-services` → 200, bare array.
  - `GET /v1/sgx/companies/?sector=financial-services` → 410 `v1_discontinued` (matches user error verbatim).

## Key Technical Decisions

- **Decision: Rewrite `fetchCompaniesBySubindustry` and `fetchCompaniesBySubsector` to call `/v2/companies/?where=...` instead of the gone `?sub_industry=`/`?sub_sector=` endpoints.** Rationale: legacy filter endpoint is removed in v2; the screener is the only path. Accept the envelope shape change; the MCP wrapper passes it through transparently.
- **Decision: Fix URL composition by switching `new URL(absolutePath, baseUrl)` to template-string concatenation** (the codebase's dominant pattern). Rationale: WHATWG URL treats absolute paths as full-pathname overrides, dropping `/v2`. Three lines of edit beat introducing a `joinUrl()` helper.
- **Decision: Add a small kebab→display `subsectorSlugToName` lookup in `src/utils/subsectors.ts`, populated by hard-coded mapping derived from `/v2/subsectors/`.** Rationale: 25–30 fixed slugs, changes rarely. A static table is predictable, testable, and avoids a network call on every report request. Falling back to `subsector.replace(/-/g, " ")` plus title-case is too lossy for `food-beverage` → "Food & Beverage". Implementer should curl `/v2/subsectors/` once and confirm Supabase column casing via `select distinct sub_sector from idx_company_report` before hard-coding.
- **Decision: For dividend, add an `Array.isArray` guard plus a typed error message; do not attempt to coerce object→array.** Rationale: if Supabase stores a non-array there, the data is malformed and silently coercing hides upstream issues.
- **Decision: For SGX historical volatility, fix the shape mismatch in place (read `{date: price}` from `all_time_price.{90_d_high, 90_d_low}` etc.) — do NOT switch to a stdev-of-returns algorithm.** Rationale: scope says "fix bugs, not redesign." The high/low range estimate is the existing contract; bug is data-extraction.
- **Decision: Treat the SGX-companies `v1_discontinued` error as a deployment issue, not a code issue.** Rationale: code path is correct; the error literally identifies the offending base URL. Plan includes a verification + redeploy step rather than a code change.

## Open Questions

### Resolved During Planning

- **Is `/v2/companies/?sub_industry=...` supported?** No. Confirmed via live API (`UNSUPPORTED_PARAMETERS`). Must use `?where=sub_industry='...'`.
- **Does the screener accept kebab-case slugs in the where clause?** Yes. `where=sub_industry='banks'` returns 48 IDX banks. `where=sub_sector='banks'` works identically.
- **Does the v2 SGX report URL composition bug reproduce?** Yes. `new URL('/sgx/...', 'https://api.sectors.app/v2')` resolves to `https://api.sectors.app/sgx/...` (verified by WHATWG semantics and 301 response from live API).
- **Is `v1_discontinued` an upstream code bug or deployment?** Deployment. `/v1/sgx/companies/` returns exactly that error; `/v2/sgx/companies/` returns 200.
- **Does the SGX `all_time_price.90_d_high` field have a `.price` subfield?** No. Confirmed shape is `{"2026-05-12": 59.099998}` — a one-entry date→price map.

### Deferred to Implementation

- **Exact Supabase column case for `idx_company_report.sub_sector`.** Plan assumes Title-case (e.g. "Banks", "Food & Beverage") based on user's error message. Implementer should run `select distinct sub_sector from idx_company_report` first; if the column actually stores kebab, the bug is something else (regex normalization or whitespace) and the slug-map approach is wrong.
- **Whether the deployed `sectors-mcp` worker uses `SECTORS_API_BASE=/v1` or `/v2`.** Implementer must run `wrangler secret list` (or read Cloudflare dashboard env vars) before/after redeploy. If `/v1`, that is bug #2's actual root cause — and the local v2 commit's deploy was either skipped or env wasn't updated.
- **Parity audit findings on `fetch-company-report`, `fetch-quarterly-financials`, `fetch-top-companies`.** Probe each; if a shape drift exists, log as follow-up tasks but DO NOT widen this plan unless the drift outright breaks the tool.
- **The latent same-bug status of `subsector` matching in `getIpoCompanies`, `topCompaniesByMetrics`, `freeFloat`.** Flag during Unit 4 implementation. Fixing is in scope only if the same kebab/display mismatch is observed against live Supabase.

## Implementation Units

- [ ] **Unit 1: Fix SGX company report URL composition**

  **Goal:** Restore HTTP 200 for `fetch-sgx-company-report` against any valid SGX ticker (D05, U11, Z74).

  **Requirements:** R1 (bug #3).

  **Dependencies:** None.

  **Files:**
  - Modify: `src/tools/sgxCompanyReport.ts` (around line 81)
  - Modify: `src/tools/companies.ts` (around line 612 — same bug in dead duplicate; fix or delete)

  **Approach:**
  - Replace `new URL('/sgx/company/report/${ticker}', baseUrl)` with template-string concat matching the codebase convention, e.g. `` `${baseUrl}/sgx/company/report/${cleanTicker}/` ``.
  - The duplicate in `companies.ts` is dead (only `sgxCompanyReport.ts` is registered in `registerTools.ts`). Easiest fix: leave it for the deferred cleanup plan. Riskier: delete it now — but that's a scope-creep boundary call. Default: fix the URL there too, defer deletion.
  - Preserve `.replace(/\.si$/i, '')` ticker cleanup; the API tolerates it but stripping keeps the URL canonical.

  **Patterns to follow:**
  - `src/tools/companies.ts:169` (`${baseUrl}/companies/?sub_sector=…`)
  - `src/tools/subsectors.ts:13`

  **Test scenarios:**
  - `D05` → 200, response has `overview.market_cap > 0`.
  - `D05.SI` (mixed case) → 200, same payload.
  - `XXX` (invalid) → graceful error message, not 500.
  - `d05` (lowercase) → 200 (API is case-insensitive).

  **Verification:**
  - Local `npm run dev`; call the tool via MCP inspector; response shows DBS data, not a Not Found.
  - `grep -n "new URL(" src/tools/sgxCompanyReport.ts src/tools/companies.ts` returns zero hits for the broken pattern.

- [ ] **Unit 2: Fix get-company-dividend Array.isArray guard**

  **Goal:** Eliminate the `.find is not a function` crash; return a clean "no dividend history available" error instead.

  **Requirements:** R1 (bug #5).

  **Dependencies:** None.

  **Files:**
  - Modify: `src/tools/getCompanyDividend.ts` (around line 40–47)

  **Approach:**
  - Before `.find(...)`, add `if (!Array.isArray(data.historical_dividends)) throw new Error(\`No dividend history array for \${normalizedSymbol}\`)`.
  - Drop the `as any as YearlyDividend[]` double-cast in favor of `as YearlyDividend[]` after the guard.
  - Keep the existing "no rows for year N" branch unchanged.

  **Patterns to follow:**
  - No prior example in repo. This unit establishes the pattern.

  **Test scenarios:**
  - Ticker with array `historical_dividends` and matching year → returns dividend row.
  - Ticker with array but no matching year → "No dividend data found for X in year Y" (existing branch).
  - Ticker whose `historical_dividends` is null → existing `!data?.historical_dividends` branch fires.
  - Ticker whose `historical_dividends` is an object/string (the original bug case) → "No dividend history array for X" (new branch), no crash.

  **Verification:**
  - Identify a ticker that previously crashed (user can supply, or implementer can `select symbol, jsonb_typeof(historical_dividends) from idx_company_report where jsonb_typeof(historical_dividends) != 'array' limit 5`).
  - Tool returns the guarded error string, not a stack trace.

- [ ] **Unit 3: Rewrite subindustry and subsector company-list tools to v2 screener**

  **Goal:** `fetch-companies-by-subindustry` and `fetch-companies-by-subsector` return real company results for valid kebab slugs.

  **Requirements:** R1 (bug #1), R2.

  **Dependencies:** None.

  **Files:**
  - Modify: `src/tools/companies.ts` — `fetchCompaniesBySubindustry` (around line 179) and `fetchCompaniesBySubsector` (around line 159).

  **Approach:**
  - Change the URL from `${baseUrl}/companies/?sub_industry=${slug}` (resp. `sub_sector`) to `${baseUrl}/companies/?where=${encodeURIComponent(\`sub_industry='\${slug}'\`)}&limit=200`.
  - Same change for the subsector variant.
  - Response shape changes from `CompanyResponse[]` to `{results: CompanyResponse[], pagination: {...}}`. Two options:
    1. Update the type and return the envelope (lets clients paginate).
    2. Unwrap `.results` and keep the bare-array contract.
  - Pick (1) — it's what v2 actually returns and exposes pagination metadata to the LLM. Update `CompanyResponse[]` → a new `CompanyScreenerResponse` type alongside the existing interface.
  - URL display lines (around 379–381, 416–418) already show `subsector/...` and `subindustry/...` paths that don't match real API — update those to reflect the new screener URL so the tool's output is honest.
  - `limit=200` matches the documented max; document the cap in the tool description.

  **Patterns to follow:**
  - The pagination-aware return is unprecedented in this codebase; this unit establishes it. Keep the impl local to these two helpers — do not retrofit other tools.

  **Test scenarios:**
  - `subIndustry: "conventional-banks"` → expect ≥1 result OR an empty array if the slug is wrong (user's screenshot suggested `conventional-banks` isn't a v2 slug — confirm against `/v2/subindustries/`).
  - `subIndustry: "banks"` → 48 results (live-API verified).
  - `subSector: "food-beverage"` → ≥1 result.
  - Invalid slug `subIndustry: "made-up"` → API returns empty `results: []`, tool returns same; no crash.

  **Verification:**
  - Live MCP call returns `{results: [...], pagination: {...}}` JSON.
  - No `/v1/` strings introduced.
  - The displayed "API URL: ..." line in the tool's text content matches the actual fetch URL.

- [ ] **Unit 4: Add subsector slug→display map and fix get-subsector-report lookup**

  **Goal:** `get-subsector-report` with kebab input ("banks") returns the expected company list and aggregates.

  **Requirements:** R1 (bug #4).

  **Dependencies:** None. (May surface latent bugs in `getIpoCompanies`/`topCompaniesByMetrics`/`freeFloat`; flag, don't fix here.)

  **Files:**
  - Create: `src/utils/subsectors.ts`
  - Create: `src/utils/subsectors.test-fixtures.md` — *optional, only if implementer wants a checked-in record of the slug→display table for future drift detection. Otherwise inline-comment the source.*
  - Modify: `src/tools/subsectorReport.ts` (around line 87)

  **Approach:**
  - **Step A (verification, do before coding):** With the user-supplied API key, run `select distinct sub_sector from idx_company_report order by 1` via Supabase (or call any of the working subsector tools and inspect the value). Confirm the column stores display strings like "Banks", "Food & Beverage".
  - **Step B (table):** Populate `subsectorSlugToName: Record<string, string>` from `/v2/subsectors/` (live-verified slugs). Initial keys observed: `banks`, `financing-service`, `insurance`, `food-beverage`, `tobacco`, `transportation`, `telecommunication`, `heavy-constructions-civil-engineering`, `properties-real-estate`, `utilities`, `healthcare-equipment-providers`, `pharmaceuticals-health-care-research`, `nondurable-household-products`, `media-entertainment`, `industrial-goods`, `food-staples-retailing`, `industrial-services`, `software-it-services`, `transportation-infrastructure`, `oil-gas-coal`, `leisure-goods`, `basic-materials`, `household-goods`, `consumer-services`, and the ~5 more truncated in the live response.
  - Export `normalizeSubsectorSlug(input: string): string` that:
    1. Lowercases & trims.
    2. Looks up in the table — returns the display name if found.
    3. If not found, throws `Error("Unknown subsector slug: <input>. Try get-subsectors for valid options.")`.
  - **Step C (wire):** In `subsectorReport.ts:87`, replace `.eq("sub_sector", subsector)` with `.eq("sub_sector", normalizeSubsectorSlug(subsector))`. Keep the existing "No companies found" error as a secondary guard (it now indicates Supabase data gap, not user input issue).
  - **Step D (latent-bug flag, no fix):** Add a one-line code comment at the top of `getIpoCompanies.ts`, `topCompaniesByMetrics.ts`, `freeFloat.ts` noting "sub_sector input is assumed to match Supabase column form — see docs/plans/...001-fix-v2-migration-breakage-plan.md Unit 4 for latent issue."

  **Patterns to follow:**
  - `src/utils/tickers.ts` (single-purpose normalize util, throws on invalid).

  **Test scenarios:**
  - `subsector: "banks"` → returns ≥1 company, aggregates non-zero.
  - `subsector: "Banks"` (already display form, mixed case) → also normalizes via lowercase lookup; returns same.
  - `subsector: "food-beverage"` → returns rows where `sub_sector = "Food & Beverage"`.
  - `subsector: "nonexistent"` → "Unknown subsector slug" error.
  - `subsector: ""` → "Unknown subsector slug" error.

  **Verification:**
  - All slugs from `/v2/subsectors/` round-trip through the map (manual or assertion-style script).
  - User's original failing call (`banks`) now returns aggregates.

- [ ] **Unit 5: Fix calculate-singapore-historical-volatility data extraction**

  **Goal:** Tool returns a volatility number for any SGX ticker that has price data, instead of "Could not calculate volatility with available price data."

  **Requirements:** R1 (bug #6).

  **Dependencies:** None.

  **Files:**
  - Modify: `src/tools/getSingaporeAdvancedMetrics.ts` (around lines 96–145)

  **Approach:**
  - Update the `PriceRangeData` interface (lines 19–28): each field is `Record<string, number>` (date→price map), not `{date: string; price: number}`.
  - In `fetchHistoricalVolatility`, extract high/low like this (pseudo, directional):
    - For `90d`: `const entry = Object.entries(priceData.all_time_price["90_d_high"])[0]; const high = entry?.[1];` (similarly for low).
    - Repeat for `52w` (`52_w_high`/`52_w_low`) and `all_time` (`all_time_high`/`all_time_low`).
  - Keep the rest of the math (range %, annualization) untouched.
  - If the column itself is missing or a key is absent, surface a clear error.

  **Patterns to follow:**
  - `src/tools/getSingaporeDailyTransaction.ts:47` — already iterates `Object.entries` over date→value maps.

  **Test scenarios:**
  - `D05`, `90d` → returns a positive `historicalVolatility` number, `high`/`low` populated from `2026-05-12`/`2026-03-09` style dates.
  - `D05`, `52w` → also succeeds.
  - `D05`, `all_time` → succeeds.
  - Ticker with no `all_time_price` row → "No price range data available."
  - Ticker where one of the keys is `{}` (empty map) → "Could not extract high/low for 90d."

  **Verification:**
  - Local MCP call returns a JSON volatility result for D05 across all three timeframes.

- [ ] **Unit 6: Verify and (if needed) update deployed SECTORS_API_BASE**

  **Goal:** The deployed worker hits `/v2/...`. Bug #2 (`v1_discontinued`) resolves without code change.

  **Requirements:** R1 (bug #2), R4.

  **Dependencies:** Units 1–5 should land first so the redeploy carries all fixes.

  **Files:**
  - Read: `wrangler.jsonc` — no `vars` block; env vars come from Cloudflare dashboard or `.dev.vars`.
  - Possibly modify: Cloudflare Worker env via `wrangler secret put SECTORS_API_BASE` or dashboard.

  **Approach:**
  - Run `wrangler secret list` against the deployed worker (or check dashboard) to read the current `SECTORS_API_BASE`.
  - If it equals `https://api.sectors.app/v1` (or unset and falling back to a stale literal), set it to `https://api.sectors.app/v2`.
  - `src/config.ts:2` already defaults to `/v2` when env is unset, so unsetting the var is also a valid fix.
  - Redeploy via `npm run deploy`.
  - Smoke-test against the deployed worker (the MCP-remote URL from README) — call `fetch-sgx-companies-by-sector` with `financial-services`; confirm no `v1_discontinued`.

  **Execution note:** This unit is operational, not a code change. Skip writing it as application code; treat as a deploy-checklist task.

  **Patterns to follow:** N/A.

  **Test scenarios:**
  - Before: `fetch-sgx-companies-by-sector` against the deployed worker → 410.
  - After: same call → 200, list of SGX financial-services companies.

  **Verification:**
  - `wrangler secret list` shows `SECTORS_API_BASE` either unset or `…/v2/`.
  - `grep -rn "/v1/" src/ README.md docs/` excluding the brainstorm and this plan returns nothing (this also closes brainstorm R4 if it was reopened by the fixes above).

- [ ] **Unit 7: Parity audit — company-report, quarterly-financials, top-companies**

  **Goal:** Answer the brainstorm's deferred "Are v2 response shapes byte-identical to v1?" question for three representative endpoints. Fix only if shape drift outright breaks the tool's text output.

  **Requirements:** R3.

  **Dependencies:** None (can run in parallel with Units 1–5).

  **Files:**
  - Read: `src/tools/companyReport.ts`, `src/tools/companies.ts` (`fetchQuarterlyFinancials`), `src/tools/topCompanies.ts`.
  - Possibly modify: any of the above if a field rename is detected and the tool consumes the renamed field.

  **Approach:**
  - For each endpoint, curl the v2 path with a known ticker (BBCA, KOMPAS100, etc.), pretty-print, and diff field names against the TypeScript interface in the tool file.
  - If interface fields are all `[key: string]: any` (which several are), no real risk — the JSON pass-through still works; just note observed top-level keys for future reference.
  - If a field is explicitly accessed (e.g. `report.overview.sector` in `sgxCompanyReport.ts`), confirm it exists in v2.

  **Patterns to follow:** N/A.

  **Test scenarios:**
  - `fetch-company-report BBCA` → returns 200 with `overview`, `valuation`, `financials` keys.
  - `fetch-quarterly-financials BBCA` → returns array of quarter objects.
  - `fetch-top-companies` (whichever default param) → returns 200.

  **Verification:**
  - For each: record the v2 top-level response keys in `docs/plans/2026-05-13-001-fix-v2-migration-breakage-plan.md` under a "Parity audit results" appendix, or in a separate `docs/notes/v2-shape-audit.md`.
  - Any drift severe enough to break a tool → add a Unit 8 to fix; otherwise close as "no action required."

## System-Wide Impact

- **Interaction graph:** The MCP `server.tool(...)` registration in `src/tools/registerTools.ts:47` is unchanged. Tool names and argument schemas stay identical. Clients that pinned to specific JSON keys in the response payload of `fetch-companies-by-subindustry`/`fetch-companies-by-subsector` will see a new envelope `{results, pagination}` — this is a breaking shape change for those callers. The MCP wrapper does not deserialize, so the LLM consumer is the only "client" — acceptable.
- **Error propagation:** All six tools already wrap fetch/Supabase calls in `try/catch` and return `{ content: [{ type: "text", text: \`Error: …\` }] }`. New errors from Units 2, 4, 5 follow that same pattern. No change to MCP-level error semantics.
- **State lifecycle risks:** No persistent state mutated. No new caches.
- **API surface parity:** Subindustry and subsector helpers diverge from each other if only one is rewritten — Unit 3 rewrites both for symmetry.
- **Integration coverage:** No automated tests in repo. Verification relies on manual curl + MCP-inspector calls. After all units land, recommend the user runs the full README tool list against the deployed worker once to confirm no regression in the 30+ untouched tools.

## Risks & Dependencies

- **Risk: Supabase column `idx_company_report.sub_sector` does NOT store Title-case strings.** Mitigation: Unit 4 Step A is a verification-first action. If wrong, the bug is elsewhere and the slug map is wasted effort; surface immediately, don't ship.
- **Risk: `SECTORS_API_BASE` is set in some place other than Worker secrets — e.g., hard-coded in a Cloudflare KV binding or pre-build env.** Mitigation: Unit 6 includes a `wrangler.jsonc` grep step; the JSON has no `vars` block today, so secrets-only is the likely surface. If it's set elsewhere, surface and adjust.
- **Risk: v2 `/companies/?where=` rate-limits the screener more aggressively than the old `?sub_sector=` filter.** Mitigation: no immediate mitigation in this plan. If rate limits hit, follow-up to add caching or shift the subsector-list tools to read from Supabase directly.
- **Risk: The duplicate dead `registerSGXCompanyReportTool` in `companies.ts:619` could be accidentally activated by a future contributor and override the real implementation.** Mitigation: out of scope; flagged in "Scope Boundaries" as deferred cleanup.
- **Dependency: User-supplied API key (received during planning) is rotated promptly after planning.** Plan does not embed the key; verification uses it ephemerally only.

## Documentation / Operational Notes

- Update `README.md` "Available Tools" section only if Unit 3 changes the response envelope of `fetch-companies-by-subindustry`/`fetch-companies-by-subsector` enough to warrant a description tweak.
- Add to `src/config.ts` a one-line comment that `SECTORS_API_BASE` is the single base after the v2 migration (closes brainstorm R2 documentation gap).
- After Unit 6 redeploys, smoke-test the cloud-hosted instance referenced in README (Quick Start) so the user-facing demo stays green.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-13-v1-to-v2-api-migration-requirements.md](../brainstorms/2026-05-13-v1-to-v2-api-migration-requirements.md)
- **Live API verification log** (May 2026):
  - `GET /v2/sgx/company/report/D05/` → 200
  - `GET /v2/sgx/companies/?sector=financial-services` → 200
  - `GET /v2/companies/?sub_industry=conventional-banks` → 400 `UNSUPPORTED_PARAMETERS`
  - `GET /v2/companies/?where=sub_industry='banks'&limit=3` → 200, 48 banks
  - `GET /v1/sgx/companies/?sector=financial-services` → 410 `v1_discontinued`
  - `GET /v2/subsectors/` → 200, 25+ kebab slugs
- **Related code:**
  - `src/tools/sgxCompanyReport.ts:81`, `src/tools/companies.ts:612` — URL composition bug
  - `src/tools/getCompanyDividend.ts:45` — array guard missing
  - `src/tools/subsectorReport.ts:87` — slug mismatch
  - `src/tools/getSingaporeAdvancedMetrics.ts:96-145` — shape mismatch
  - `src/utils/tickers.ts` — normalize-util pattern to mirror
- **Related commit:** `86123a0 feat: Migrate API base URL from v1 to v2` (the v2 cutover that exposed these breaks).
