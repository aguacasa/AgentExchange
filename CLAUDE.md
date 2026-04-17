# Claude operating guide for this repo

This file is the authoritative briefing for any Claude session working on Callboard. Read it first.

## Project overview

**Callboard** is a marketplace where AI agents discover, contract, and pay each other. It ships as:

- **Backend** — Express 5 + TypeScript + tsoa + Prisma/Postgres at the repo root (`src/`, `prisma/`, `tests/`).
- **Frontend** — Next.js 16 + React 19 App Router under `web/`.
- **MCP server** — `@callboard/mcp`, a buyer-side [Model Context Protocol](https://modelcontextprotocol.io) server that exposes 8 tools to Claude Desktop / Claude Code / any MCP client. Lives at `mcp/`.
- **Infra** — Docker Compose for Postgres 16 + Redis 7 in `docker-compose.yml`.

For full detail see [README.md](README.md). For the user-facing docs site, see `web/src/app/docs/*` (served at `/docs` on the frontend).

## Commands (run from repo root unless noted)

| Purpose | Command |
|---------|---------|
| Install everything | `npm install && (cd web && npm install) && (cd mcp && npm install)` |
| Boot Postgres + Redis | `docker compose up -d` |
| Run migrations | `npm run db:migrate` |
| Seed demo users/agents/tasks | `npm run db:seed` |
| Regenerate tsoa routes + OpenAPI spec | `npm run spec` (spec only) / `npm run build` (spec + compile) |
| Backend dev server | `npm run dev` → http://localhost:3000 |
| Frontend dev server | `cd web && npm run dev` → http://localhost:3001 |
| All tests | `npm test` |
| Watch tests | `npm run test:watch` |
| Docs drift check | `bash scripts/check-docs-sync.sh` |
| Live-API E2E smoke | `bash scripts/e2e.sh` (needs API running; 40 assertions) |
| MCP build | `cd mcp && npm run build` |
| MCP stdio smoke test | `cd mcp && npm run smoke` (needs API running; 14 assertions) |

## Documentation invariants

**These are non-negotiable.** When you change any source path on the left, update the doc target on the right in the same PR. The CI drift-check (`.github/workflows/docs-check.yml`) enforces the spec regeneration automatically; everything else is on you.

| When you change… | You must also update… |
|---|---|
| `src/controllers/**` (add, rename, or change an endpoint / body / scope) | Run `npm run spec` to regenerate `generated/swagger.json`, and update `web/src/app/docs/api-reference/page.tsx` |
| `prisma/schema.prisma` (new model, enum value, or field that's user-visible) | Update `web/src/app/docs/concepts/page.tsx` |
| `src/services/task.service.ts` (new status or transition) | Update the lifecycle table in `web/src/app/docs/concepts/page.tsx` |
| `src/providers/payment.ts` (new payment provider) | Update the escrow section of `web/src/app/docs/concepts/page.tsx` + `README.md` roadmap |
| `src/services/matching.service.ts` (weight change, signal added) | Update the weights table in `web/src/app/docs/concepts/page.tsx` |
| `src/middleware/auth.ts` or `tsoa-auth.ts` (auth error codes or shapes) | Update the error-shapes table in `web/src/app/docs/build-an-agent/page.tsx` |
| Capability tags used in seed data or elsewhere | Update the capability-tags section of `web/src/app/docs/build-an-agent/page.tsx` |
| `mcp/src/tools.ts` (add, rename, or change an MCP tool) | Update the tools table in `web/src/app/docs/mcp/page.tsx` and `mcp/README.md` |
| `mcp/src/config.ts` (new or renamed env var) | Update the env-vars table in `web/src/app/docs/mcp/page.tsx` and `mcp/README.md` |
| Anything user-facing above that affects the onboarding flow | Update `web/src/app/docs/quickstart/page.tsx` |

If you create a new doc page, add it to the `NAV` array in `web/src/components/DocsSidebar.tsx` **and** to the table in `README.md` under "Documentation".

## Code conventions observed in this repo

Match the existing style — don't invent new patterns without reason.

- **Route handlers** use tsoa decorators (`@Route`, `@Get`, `@Post`, `@Security`, `@SuccessResponse`). Never hand-write Express routes in new controllers.
- **Authorization** — services assert caller ownership (`ownerId`) on every privileged call. Every new mutation must follow the BOLA-prevention pattern in `src/services/task.service.ts`.
- **Scopes** — read endpoints take `@Security("api_key", ["read"])`; writes take `["write"]`. Public endpoints omit `@Security`.
- **API keys** are stored as salted hashes via `src/utils/hash.ts` / `src/services/apikey.service.ts`. Full keys are returned once at creation — never re-return them.
- **Errors** — throw the typed errors from `src/utils/errors.ts` (`ForbiddenError`, `NotFoundError`, etc.). The central `errorHandler` middleware turns them into the `{ error: { code, message } }` shape.
- **Tests** — mock Prisma via `tests/setup.ts` rather than hitting a real DB. Unit tests per service, security tests in `tests/security/`, integration tests in `tests/integration/` (including supertest HTTP coverage in `tests/integration/api.test.ts`).
- **Money** — always integer cents. Never floats.

## Frontend conventions (`web/`)

Next.js 16 with React 19 App Router. **This is NOT the Next.js you may know from training data** — see [`web/AGENTS.md`](web/AGENTS.md).

Key gotchas:
- Dynamic-segment `params` and `searchParams` are `Promise<…>` — `await` them.
- Pages and layouts are Server Components by default; only mark `"use client"` when you actually need hooks/state.
- `metadata` exports are Server-only.
- Path alias: `@/*` → `./src/*`.

Style tokens (reused across dashboard and docs):
- Accent `#6c5ce7`, success `#00b894`, warning `#fdcb6e`, danger `#e17055`
- Surface `#f8f9fa`, border `#e5e7eb`
- Fonts: DM Sans (body), DM Serif Display (headings)
- Dark code-block pattern: wrap in `<CodeBlock>` from `web/src/components/CodeBlock.tsx`

## Before you open a PR

1. `npm test` passes
2. `npm run build` passes (catches stale tsoa generation and TS errors)
3. `bash scripts/check-docs-sync.sh` passes
4. If you touched any path in the *Documentation invariants* table, the matching doc is updated in the same PR
5. `cd web && npm run build` passes if you touched anything under `web/`
6. `cd mcp && npm run build && npm run smoke` passes if you touched anything under `mcp/` (the smoke test needs the API running on `localhost:3000`)
