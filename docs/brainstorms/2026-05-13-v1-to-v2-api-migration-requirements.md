---
date: 2026-05-13
topic: v1-to-v2-api-migration
---

# v1 → v2 Sectors API Migration

## Problem Frame
Upstream `api.sectors.app` migrated all v1 endpoints to v2. The MCP server currently defaults `SECTORS_API_BASE` to `/v1` and carries a separate `SECTORS_API_BASE_V2` constant (used only by `freeFloat`) as transitional scaffolding. Continuing to hit `/v1` risks broken or deprecated responses; the dual-constant split is no longer meaningful and creates ongoing confusion.

## Requirements
- R1. All tool calls hit `https://api.sectors.app/v2/...` by default.
- R2. `SECTORS_API_BASE_V2` is removed; `SECTORS_API_BASE` is the single source of truth.
- R3. `freeFloat` tool registration uses `SECTORS_API_BASE` (same as every other tool).
- R4. No literal `/v1/` strings remain in `src/`, `README.md`, or `docs/` (excluding this brainstorm doc and historical changelog entries if any).

## Success Criteria
- `npm run type-check` passes.
- `npm run dev` starts and a representative tool call (e.g. company report, free float) returns a v2 response.
- `grep -rn "/v1/" src/ README.md docs/` returns no project hits.

## Scope Boundaries
- Not refactoring tool signatures or response shapes — assume v2 is a drop-in path swap.
- Not changing auth, OAuth, or KV layout.
- Not adding a v1 fallback or feature flag — clean cutover.
- Not handling breaking response-schema changes between v1 and v2 (deferred; surface in planning if discovered).

## Key Decisions
- **Collapse to single base**: delete `SECTORS_API_BASE_V2`, flip `SECTORS_API_BASE` default to `/v2`. Rationale: v1 is gone, dual constants are dead weight, single source of truth reduces future drift.
- **No backwards-compat shim**: the user confirmed full upstream migration; carrying a v1 escape hatch adds carrying cost for zero realistic benefit.

## Dependencies / Assumptions
- v2 endpoints are path-compatible drop-ins for v1 (same routes, same params, same response shape). If not, scope expands — flag during planning/work.
- Production `SECTORS_API_BASE` env var (if set in `wrangler.toml` vars or `wrangler secret`) may still point to `/v1`. User is unsure. Must verify before deploy.

## Outstanding Questions

### Resolve Before Planning
(none)

### Deferred to Planning
- [Affects R1][Needs research] Does `wrangler.toml` or any deployed secret override `SECTORS_API_BASE` with a `/v1` URL? If yes, update during deploy step.
- [Affects all][Needs research] Are v2 response shapes byte-identical to v1, or are there field renames/removals that would break downstream tool output? Spot-check 2-3 representative endpoints (e.g. company-report, quarterly-financials, top-companies) before declaring done.

## Next Steps
→ `/ce:plan` for structured implementation planning
