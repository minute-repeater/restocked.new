# Restocked.now

A product tracking and stock alert service. Users add product URLs, and the system monitors them for stock changes and price drops, sending notifications when conditions are met.

## Project Status: MVP Complete

### What's Working

- [x] **Authentication** - Register/login with JWT tokens
- [x] **Product tracking** - Add URLs, automatic data extraction
- [x] **Multi-strategy scraper** - HTTP-first, Playwright fallback
- [x] **Dashboard UI** - View/manage tracked products
- [x] **Shopify support** - Full extraction via `og:price:*` meta tags
- [x] **Database** - PostgreSQL on Railway, migrations applied
- [x] **Local development** - API + Web servers running

### In Progress / Not Yet Deployed

- [ ] Email notifications (Resend integration built, needs testing)
- [ ] Background worker deployment (scheduler built, needs Railway setup)
- [ ] Production deployment to Railway/Vercel
- [ ] Price history tracking UI

### Test Credentials (Local Dev)

- **Email:** `dylan@test.com`
- **Password:** `password123`
- **Plan:** Premium (100 items, 5-min checks)

## Architecture

This is a **pnpm monorepo** with three packages and three apps:

```
restocked.now/
├── packages/
│   ├── shared/     # TypeScript types, constants, utilities
│   ├── db/         # Drizzle schema, migrations, database client
│   └── scraper/    # Product page fetching and data extraction
├── apps/
│   ├── api/        # Express REST API (auth, tracking CRUD)
│   ├── worker/     # Background job scheduler (stock checks, notifications)
│   └── web/        # React dashboard (Vite + TailwindCSS)
└── .env            # Environment variables (not committed)
```

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Scraping**: HTTP-first with Cheerio, Playwright fallback for JS-heavy sites
- **Auth**: JWT + bcrypt
- **Email**: Resend API
- **Frontend**: React 18, React Router, TanStack Query, TailwindCSS

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL database (or Railway project)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, RESEND_API_KEY
```

### Environment Variables

```bash
# Database (Railway provides this)
DATABASE_URL=postgresql://user:password@host:port/database

# API
JWT_SECRET=your-secret-key-at-least-32-characters

# Worker
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### Database Setup

```bash
# Generate migrations from schema
pnpm --filter db generate:pg

# Run migrations
pnpm --filter db migrate
```

### Development

```bash
# Terminal 1: API server (port 3000)
pnpm --filter api dev

# Terminal 2: Frontend (port 5173)
pnpm --filter web dev
```

## Supported Retailers

The scraper uses a three-tier extraction strategy:

1. **JSON-LD** (confidence: 0.9) - Structured product data
2. **Meta Tags** (confidence: 0.6) - Open Graph and product meta tags
3. **DOM Parsing** (confidence: 0.5) - CSS selectors for common patterns

### Tested Retailers

| Retailer | Name | Price | Image | Stock | Notes |
|----------|------|-------|-------|-------|-------|
| Amazon | ✅ | ❌ | ✅ | ✅ | Price blocked by bot detection |
| Apple | ✅ | ❌ | ✅ | ❌ | Custom store format |
| Shopify stores | ✅ | ✅ | ✅ | ✅ | Full support via og:price:* |
| A Kind of Guise | ✅ | ✅ | ✅ | ✅ | Shopify-based |
| Uniqlo | ✅ | ❌ | ✅ | ❌ | JS-rendered prices |
| Allbirds | ✅ | ✅ | ✅ | ✅ | Shopify-based |
| Skims | ✅ | ✅ | ✅ | ✅ | Shopify-based |

### Shopify Support (Recently Added)

Full support for Shopify stores using `og:price:amount` meta tag format:

```html
<meta property="og:price:amount" content="50.00">
<meta property="og:price:currency" content="USD">
```

This enables extraction from thousands of Shopify-powered stores including:
- Baklava Flea Market, Allbirds, Skims, Gymshark, and many more

**Note:** Shopify stores may serve geo-localized pricing (e.g., CAD vs USD based on IP).

## API Endpoints

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token
- `GET /auth/me` - Get current user (requires auth)

### Tracking (all require auth)
- `GET /tracking` - List tracked items with latest stock/price
- `POST /tracking` - Add new tracked item `{ url, targetPrice? }`
- `PATCH /tracking/:id` - Update item (target price, active status)
- `DELETE /tracking/:id` - Soft delete (sets isActive=false)

## Database Schema

### Core Tables

- **users**: Account info, plan tier (free/premium/business)
- **products**: Unique products by normalized URL
- **variants**: Product variants (size, color, etc.)
- **tracked_items**: Links users to products they're tracking
- **stock_checks**: Historical log of every stock/price check
- **notifications**: Record of sent notifications

### Key Relationships

```
users ─┬─── tracked_items ──── products ──── variants
       │         │                 │
       │         └─ notifications  └─ stock_checks
       │
       └─── user_notification_settings
```

## Plan Limits

| Plan     | Max Items | Check Interval | History |
|----------|-----------|----------------|---------|
| Free     | 3         | 60 min         | 7 days  |
| Premium  | 25        | 15 min         | 30 days |
| Business | 100       | 5 min          | 90 days |

## How Stock Checking Works

1. Worker runs every 5 minutes via node-cron
2. Queries products due for checking based on user plan intervals
3. Fetches each product page (HTTP first, Playwright fallback)
4. Parses HTML using multiple strategies:
   - JSON-LD structured data (most reliable)
   - Open Graph meta tags (including Shopify's og:price:*)
   - DOM element analysis (buttons, text patterns)
5. Compares to previous check
6. If stock status changed or price dropped, queues notification
7. Sends email via Resend API

## Development Commands

```bash
# Start dev servers
pnpm --filter api dev        # API on :3000
pnpm --filter web dev        # Frontend on :5173
pnpm --filter worker dev     # Background worker

# Database
pnpm --filter db generate:pg # Generate migrations
pnpm --filter db migrate     # Run migrations

# Build for production
pnpm build                   # Build all packages
```

## Deployment

### Railway (API + Worker)

Both the API and Worker run from the same codebase on Railway as separate services, sharing the same PostgreSQL database.

**Service 1: API**
- Start command: `node apps/api/dist/server.js`
- Health check: `GET /health`

**Service 2: Worker**
- Start command: `node apps/worker/dist/scheduler.js`

### Vercel (Frontend)

Deploy the `apps/web` directory to Vercel:
- Framework: Vite
- Build command: `cd ../.. && pnpm install && pnpm build`
- Output directory: `apps/web/dist`
- Environment: `VITE_API_BASE_URL=https://your-api.up.railway.app`

## Adding Support for New Retailers

1. **Test JSON-LD first** - Most retailers use structured data
2. **Add meta selectors** to `packages/scraper/src/parser/meta.ts`
3. **Add DOM selectors** to `packages/scraper/src/parser/dom.ts`
4. **Test extraction:**
   ```bash
   # Quick test via curl
   curl -s "https://retailer.com/product" | grep -i "price\|stock"
   ```

## Notification Types

- **back_in_stock**: Product was out of stock, now available
- **price_drop**: Price decreased by 5%+
- **price_target_hit**: Price dropped to/below user's target

## Known Issues

1. **Cached failed extractions** - Products that failed extraction before fixes show null data. Workaround: delete from DB and re-add.
2. **Geo-pricing** - Shopify stores may show different prices based on IP location.
3. **Bot detection** - Some retailers (Amazon) block price extraction via HTTP.
