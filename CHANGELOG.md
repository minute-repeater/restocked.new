# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-05

### Added

#### Core Infrastructure
- **Monorepo setup** with pnpm workspaces
  - `packages/shared` - Types, constants, URL utilities
  - `packages/db` - Drizzle ORM schema and migrations
  - `packages/scraper` - Product data extraction
  - `apps/api` - Express REST API
  - `apps/worker` - Background job scheduler
  - `apps/web` - React dashboard

#### Authentication
- User registration and login with JWT tokens
- Password hashing with bcrypt
- Protected routes with auth middleware
- Plan-based access control (free/premium/business)

#### Product Tracking
- Add products by URL with automatic data extraction
- Multi-strategy scraper:
  - JSON-LD structured data (0.9 confidence)
  - Open Graph meta tags (0.6 confidence)
  - DOM element analysis (0.5 confidence)
- HTTP-first fetching with Playwright fallback for JS-heavy sites
- Normalized URL deduplication

#### Shopify Support
- Added `og:price:amount` meta tag extraction
- Added `og:price:currency` meta tag extraction
- Added `og:image:secure_url` preference
- Added Shopify-specific DOM selectors:
  - `.product-single__title`, `.product__title`
  - `.product__price`, `.money`, `[data-product-price]`
  - `.product-form__cart-submit`, `[name="add"]`

#### Dashboard UI
- Product list with images, prices, stock status
- Add product form with target price option
- Stats cards (total tracked, in stock, out of stock)
- Plan limit display and upgrade prompt
- Relative time formatting for last check

#### Database
- PostgreSQL schema with Drizzle ORM
- Tables: users, products, variants, tracked_items, stock_checks, notifications
- Migrations generated and applied to Railway

### Tested Retailers
- Amazon (name, image, stock - price blocked)
- Apple (name, image)
- Shopify stores (full support)
- A Kind of Guise (full support)
- Uniqlo (name, image)
- Allbirds (full support)
- Skims (name, stock)

### Known Issues
- Cached failed extractions show null data (workaround: delete from DB)
- Geo-pricing affects Shopify store prices based on IP
- Some retailers block price extraction via HTTP

### Not Yet Implemented
- Email notifications (Resend integration ready)
- Background worker deployment
- Production deployment to Railway/Vercel
- Price history charts
- Variant selection UI
