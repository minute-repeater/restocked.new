# StockCheck Setup Guide

## Current Status

✅ **Project Structure**: Complete
- TypeScript source code in `src/`
- Database migrations in `db/migrations/`
- Test suite in `tests/`
- API server configured

✅ **Node.js Environment**: Ready
- Node.js v20.19.5 installed
- npm v10.8.2 installed

❌ **Build Output**: Not built yet (`dist/` directory missing)
❌ **Playwright Browsers**: Not installed
❌ **Database**: Not configured
❌ **Environment Variables**: Not set

---

## Setup Steps

### 1. Install Node.js Dependencies

```bash
npm install
```

**Status**: Likely already done (node_modules exists), but run to ensure latest versions.

---

### 2. Install Playwright Browsers

The project uses Playwright for JavaScript-heavy page fetching. You need to install Chromium:

```bash
npx playwright install chromium
```

**Why**: Required for `src/fetcher/playwrightFetch.ts` to work.

---

### 3. Set Up PostgreSQL Database

#### 3a. Install PostgreSQL (if not already installed)

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Or download from**: https://www.postgresql.org/download/

#### 3b. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE stockcheck;

# Create user (optional, or use existing user)
CREATE USER stockcheck_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE stockcheck TO stockcheck_user;

# Exit psql
\q
```

#### 3c. Run Database Migrations

```bash
# Connect to your database
psql -U stockcheck_user -d stockcheck

# Run the migration
\i db/migrations/001_init.sql

# Verify tables were created
\dt

# Exit
\q
```

**Or using connection string:**
```bash
psql postgresql://stockcheck_user:your_password@localhost:5432/stockcheck -f db/migrations/001_init.sql
```

---

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Database connection string
DATABASE_URL=postgresql://stockcheck_user:your_password@localhost:5432/stockcheck

# API server port (optional, defaults to 3000)
PORT=3000

# Node environment (optional)
NODE_ENV=development
```

**Important**: Add `.env` to `.gitignore` if not already there!

---

### 5. Build the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates the `dist/` directory with compiled JavaScript.

**Watch mode** (for development):
```bash
npm run dev
```

---

### 6. Verify Setup

#### 6a. Test Database Connection

You can test the database connection by running a simple test:

```bash
npm test -- tests/db/client.test.ts
```

#### 6b. Run All Tests

```bash
npm test
```

**Note**: Some tests may require the database to be running and configured.

#### 6c. Start the API Server

```bash
# Build first if not already built
npm run build

# Start server
node dist/api/server.js
```

Or if you have a start script:
```bash
npm start  # (if configured in package.json)
```

The server will run on `http://localhost:3000` (or your configured PORT).

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

---

## Project Architecture Overview

### Core Components

1. **Fetcher** (`src/fetcher/`)
   - HTTP fetch with Playwright fallback
   - Handles JavaScript-heavy pages

2. **Parser** (`src/parser/`)
   - DOM loading and text extraction
   - JSON extraction from pages
   - Dynamic content detection

3. **Extractor** (`src/extractor/`)
   - Product information extraction
   - Combines data from multiple sources

4. **Pricing** (`src/pricing/`)
   - Multiple price extraction strategies
   - JSON, DOM, and heuristic approaches

5. **Stock** (`src/stock/`)
   - Stock/availability extraction
   - Multiple strategies (button, DOM, JSON, heuristic)

6. **Variants** (`src/variants/`)
   - Variant extraction (size, color, etc.)
   - Attribute parsing

7. **Database** (`src/db/`)
   - PostgreSQL client and repositories
   - Product and variant storage

8. **API** (`src/api/`)
   - Express REST API
   - Product, variant, and check endpoints

9. **Services** (`src/services/`)
   - Product ingestion service
   - Orchestrates extraction and storage

---

## Quick Start Checklist

- [ ] `npm install` - Install dependencies
- [ ] `npx playwright install chromium` - Install Playwright browser
- [ ] PostgreSQL installed and running
- [ ] Database created (`stockcheck`)
- [ ] Migration run (`db/migrations/001_init.sql`)
- [ ] `.env` file created with `DATABASE_URL`
- [ ] `npm run build` - Build TypeScript
- [ ] `npm test` - Run tests (verify setup)
- [ ] `node dist/api/server.js` - Start API server

---

## Troubleshooting

### Database Connection Issues

**Error**: `Connection refused` or `database does not exist`
- Verify PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
- Verify database exists: `psql -l`

### Playwright Issues

**Error**: `Browser not found`
- Run: `npx playwright install chromium`
- Check Playwright version matches `package.json`

### Build Issues

**Error**: TypeScript compilation errors
- Check `tsconfig.json` configuration
- Verify all dependencies installed: `npm install`
- Check Node.js version (requires 18+)

### Port Already in Use

**Error**: `EADDRINUSE: address already in use`
- Change `PORT` in `.env` file
- Or kill process using port 3000: `lsof -ti:3000 | xargs kill`

---

## Next Steps After Setup

1. **Test the API endpoints**:
   - `GET /health` - Health check
   - `POST /products` - Create/check a product
   - `GET /products/:id` - Get product details
   - `GET /variants` - List variants
   - `POST /checks` - Run a product check

2. **Review API routes**:
   - `src/api/routes/products.ts`
   - `src/api/routes/variants.ts`
   - `src/api/routes/checks.ts`

3. **Explore the extraction pipeline**:
   - Start with `src/services/productIngestionService.ts`
   - See how fetcher → parser → extractor → pricing/stock/variants works

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection string |
| `PORT` | ❌ No | `3000` | API server port |
| `NODE_ENV` | ❌ No | - | Environment (development/production) |

---

## Database Schema

The database includes:
- `products` - Product information
- `variants` - Product variants (size, color, etc.)
- `variant_price_history` - Price change history
- `variant_stock_history` - Stock status history
- `users` - User accounts
- `tracked_items` - User tracking preferences
- `notifications` - Notification log
- `check_runs` - Product check execution log

See `db/README.md` for detailed schema documentation.




