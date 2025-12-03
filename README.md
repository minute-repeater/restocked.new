# Restocked.now

A complete product tracking and alert service with landing page, frontend dashboard, and backend API.

## 🏗️ Project Structure

This is a monorepo containing:

```
restocked-now/
├── landing/          # Marketing/landing site (Vite + React)
├── frontend/         # Main app dashboard (Vite + React)
├── src/              # Backend API (Node.js + Express + TypeScript)
├── db/               # Database migrations
├── scripts/          # Utility scripts
└── docs/             # Documentation files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Backend Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Run database migrations
npm run migrate

# Start server
npm start
```

Backend runs on `http://localhost:3000` by default.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
echo "VITE_API_BASE_URL=http://localhost:3000" > .env

# Start dev server
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

### Landing Site Setup

```bash
cd landing

# Install dependencies
npm install

# Start dev server
npm run dev
```

Landing site runs on `http://localhost:5173` by default (or use different port).

## 📦 Deployment

### Backend (Railway)

See `DEPLOYMENT.md` for detailed Railway setup instructions.

**Key Settings:**
- Build: `npm install && npm run build`
- Start: `npm start`
- Root: `/` (project root)

### Frontend (Vercel)

**Vercel Settings:**
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Framework: Vite

**Environment Variables:**
- `VITE_API_BASE_URL` = Your backend API URL

### Landing Site (Vercel)

**Vercel Settings:**
- Root Directory: `landing`
- Build Command: `npm run build`
- Output Directory: `dist`
- Framework: Vite

**Environment Variables (Optional):**
- `VITE_APP_URL` = Frontend app URL (if on subdomain)

See `VERCEL_SETUP.md` for complete Vercel deployment guide.

## 🛠️ Development

### Running All Services Locally

**Terminal 1 - Backend:**
```bash
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
```

**Terminal 3 - Landing:**
```bash
cd landing && PORT=5174 npm run dev
```

## 📚 Documentation

- `DEPLOYMENT.md` - Complete deployment guide (Railway + Vercel)
- `PROD_LAUNCH_CHECKLIST.md` - Production launch checklist
- `VERCEL_SETUP.md` - Vercel-specific setup instructions
- `SETUP.md` - Local development setup guide

## 🗂️ Repository Structure

### Backend (`src/`)
- `api/` - Express routes and middleware
- `db/` - Database client and repositories
- `extractor/` - Product extraction logic
- `fetcher/` - Page fetching (HTTP + Playwright)
- `jobs/` - Background jobs (schedulers)
- `services/` - Business logic services
- `config.ts` - Centralized configuration

### Frontend (`frontend/`)
- `src/` - React components and pages
- `src/api/` - API client functions
- `src/components/` - Reusable components
- `src/pages/` - Page components
- `src/store/` - Zustand state management

### Landing (`landing/`)
- `src/` - React components
- `src/sections/` - Landing page sections
- `src/components/` - Shared components

## 🔧 Scripts

### Root Level
- `npm run build` - Build backend TypeScript
- `npm start` - Start backend server
- `npm run migrate` - Run database migrations
- `npm run seed:prod-user` - Seed production admin user

### Frontend
- `cd frontend && npm run dev` - Start dev server
- `cd frontend && npm run build` - Build for production

### Landing
- `cd landing && npm run dev` - Start dev server
- `cd landing && npm run build` - Build for production

## 📝 Environment Variables

### Backend (`.env` in root)
- `APP_ENV` - `production` or `development`
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `PORT` - Server port (default: 3000)
- `FRONTEND_URL` - Frontend app URL
- `BACKEND_URL` - Backend API URL
- `ENABLE_SCHEDULER` - Enable background schedulers
- `RESEND_API_KEY` - Email service API key (optional)

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL` - Backend API URL

### Landing (`landing/.env` - optional)
- `VITE_APP_URL` - Frontend app URL (if on subdomain)

## 🧪 Testing

```bash
# Backend tests
npm test

# Frontend tests (if configured)
cd frontend && npm test
```

## 📄 License

MIT

---

**Repository:** https://github.com/YOUR_USERNAME/restocked-now
