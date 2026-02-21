# Restocked.now

Stock alert service for boutique and luxury fashion. Users track product URLs and get notified when items come back in stock, drop in price, or hit a target price.

## Monorepo Structure

```
apps/
  api/          Express API (JWT auth, tracking CRUD)        → localhost:3000
  web/          React + Vite frontend (Tailwind, TanStack)   → localhost:5173
  worker/       node-cron stock checker (every 5 min)        → background process
packages/
  db/           Drizzle ORM + PostgreSQL schema
  scraper/      Multi-strategy product scraper (HTTP + Playwright)
  shared/       Types, utils, constants, logger
scripts/
  simulate-restock.ts   Test notification triggers without real stock changes
```

## Quick Start

```bash
pnpm install
cp .env.example .env           # fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY
pnpm db:migrate                # run database migrations
pnpm dev:api                   # start API on :3000
pnpm dev:web                   # start frontend on :5173
pnpm dev:worker                # start stock checker cron
```

## Key Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev:api` | API server with hot reload |
| `pnpm dev:web` | Vite dev server |
| `pnpm dev:worker` | Worker with hot reload |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests (vitest) |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm db:generate` | Generate Drizzle migration |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `npx tsx packages/scraper/src/cli.ts <url>` | Test scraper on a URL |
| `npx tsx packages/scraper/src/cli.ts --batch` | Validate 10 retailer URLs |
| `npx tsx scripts/simulate-restock.ts --list` | List tracked items for simulation |

## Architecture Rules

### CRITICAL: pino logger must NOT be in shared barrel export
The `packages/shared/src/index.ts` must NOT export the logger. Pino is a Node.js-only library. If it ends up in the barrel export, Vite will try to bundle it for the browser → blank white screen.

- Server code: `import { createLogger } from '@restocked/shared/logger'`
- Browser code: `import { getPlanLimits } from '@restocked/shared'` (safe, no pino)
- The separate export path is defined in `packages/shared/package.json` under `"exports"`

### After modifying packages/shared
Always rebuild: `pnpm --filter @restocked/shared build` — the `dist/` can get stale. Also clear Vite cache: `rm -rf apps/web/node_modules/.vite`

### CRITICAL: .tsbuildinfo files must NOT be committed
The root tsconfig has `composite: true`, which makes tsc use `.tsbuildinfo` for incremental builds. If stale `.tsbuildinfo` is committed, tsc will silently skip building on CI (empty `dist/`). These files are in `.gitignore` — never commit them.

### Environment variables
Both worker and db scripts need `--env-file=../../.env` flag (already configured in package.json scripts). The `.env` file lives at the monorepo root.

## Database Schema (7 tables)

| Table | Key columns | Notes |
|-------|------------|-------|
| `users` | id, email, password_hash, plan, email_verified | plan: free/basic/premium |
| `password_reset_tokens` | user_id, token_hash, expires_at, used_at | bcrypt-hashed tokens |
| `products` | url, normalized_url (unique), name, image_url, retailer | Deduped by normalized URL |
| `variants` | product_id, name, sku | e.g. "Size: Large" |
| `tracked_items` | user_id, product_id, variant_id, target_price, is_active | Unique(user, product, variant) |
| `stock_checks` | product_id, in_stock, price (cents), checked_at | Historical time series |
| `notifications` | user_id, tracked_item_id, type, status | Types: back_in_stock, price_drop, price_target_hit |
| `user_notification_settings` | user_id, email_enabled, email_address | Override email address |

Prices are stored in **cents** (integer). Currency is ISO 4217 (e.g. "USD").

## API Endpoints

### Auth (`/auth`)
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/register` | No | Rate limited (5/min) |
| POST | `/auth/login` | No | Rate limited (5/min) |
| GET | `/auth/me` | JWT | Current user info |
| POST | `/auth/forgot-password` | No | Always returns 200 (no enumeration) |
| POST | `/auth/reset-password` | No | Token + new password |

### Tracking (`/tracking`) — all require JWT
| Method | Path | Notes |
|--------|------|-------|
| GET | `/tracking` | List user's tracked items |
| POST | `/tracking` | Add product URL (triggers initial scrape) |
| GET | `/tracking/:id` | Full item detail + latest check |
| PATCH | `/tracking/:id` | Update target price or active status |
| DELETE | `/tracking/:id` | Soft delete (sets is_active=false) |
| GET | `/tracking/:id/history` | Last 200 stock checks |
| GET | `/tracking/:id/notifications` | Last 50 notifications |

### Utility
| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | `{ status: "ok" }` |

## Frontend Routes

| Path | Page | Layout |
|------|------|--------|
| `/` | Landing page | Public (Layout) |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/forgot-password` | Forgot password | Public |
| `/reset-password` | Reset password (token from URL) | Public |
| `/dashboard` | Tracked items grid | Dashboard (DashboardLayout) |
| `/dashboard/add` | Add product form | Dashboard |

## Scraper Architecture

3-tier extraction with confidence-based merging:

1. **JSON-LD** (confidence 0.9) — `<script type="application/ld+json">` structured data
2. **Meta tags** (confidence 0.6) — Open Graph + Shopify `og:price:amount`
3. **DOM parser** (confidence 0.5) — CSS selectors for Amazon, Shopify, generic

Fetching: HTTP first (faster), Playwright browser fallback for JS-heavy sites.

Results merged by confidence — highest-confidence source wins per field.

## Plan Tiers

| Plan | Max Items | Check Interval | History |
|------|-----------|----------------|---------|
| Free | 3 | 60 min | 7 days |
| Premium | 25 | 15 min | 30 days |
| Business | 100 | 5 min | 90 days |

## Notification Triggers

| Type | Condition |
|------|-----------|
| `back_in_stock` | Previous check: out of stock → Current: in stock |
| `price_drop` | Price decreased ≥5% from last check |
| `price_target_hit` | Current price ≤ target AND previous price > target |

## Testing

- Framework: **vitest**
- Run all: `pnpm test`
- Run one package: `pnpm --filter @restocked/shared test`
- Mock pattern for logger: `vi.mock('@restocked/shared/logger', () => ({ createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }) }))`
- Mock pattern for DB: mock `@restocked/db` at module level

## Deployment

| Service | Platform | Config | Status |
|---------|----------|--------|--------|
| Frontend | Vercel | `apps/web/vercel.json` — root dir `apps/web` | Deployed to `app.restocked.now` / `www.restocked.now` |
| API | Railway | `railway.toml` — Nixpacks, explicit build/start commands | Config ready, needs env vars |
| Worker | Railway | Same repo, separate service (override start command) | Needs separate Railway service |
| Database | Railway | PostgreSQL plugin | Needs provisioning |

### Vercel build flow
1. Install: `corepack enable && cd ../.. && pnpm install --frozen-lockfile`
2. Build: shared package tsc → vite build (skips web tsc to avoid pnpm symlink resolution issues)
3. Node.js pinned to 20 via `.node-version`

### Railway build flow
1. Nixpacks auto-detects pnpm from `pnpm-lock.yaml`
2. Build: shared → db → scraper → api (all via `pnpm --filter`)
3. Start: `node apps/api/dist/server.js`
4. Worker service: override start command to `node apps/worker/dist/scheduler.js`

### GitHub repo
`minute-repeater/restocked.new` — auto-deploys to Vercel on push to `main`

Env vars needed in production: `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`, `FRONTEND_URL`, `NODE_ENV=production`

## Tech Stack

Node.js 20+ | TypeScript | pnpm 8+ | PostgreSQL | Drizzle ORM | Express | React 18 | Vite | Tailwind CSS | React Router | TanStack Query | Playwright | Cheerio | Resend | Pino | vitest
