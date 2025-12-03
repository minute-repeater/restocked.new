# Deployment Guide

This guide covers deploying Restocked.now to production using Railway (backend) and Vercel (frontend).

## Table of Contents

1. [Backend Deployment (Railway)](#backend-deployment-railway)
2. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
3. [Landing Site Deployment (Vercel)](#landing-site-deployment-vercel)
4. [Domain Configuration](#domain-configuration)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Post-Deployment Verification](#post-deployment-verification)

---

## Backend Deployment (Railway)

### Prerequisites

- Railway account (https://railway.app)
- PostgreSQL database (Railway provides this)
- Domain name (optional, Railway provides a default)

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or "Empty Project" if deploying manually)
4. Connect your GitHub repository

### Step 2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a database and set `DATABASE_URL`

### Step 3: Configure Environment Variables

In Railway project settings → Variables, add:

```bash
# Required
APP_ENV=production
DATABASE_URL=<auto-set by Railway PostgreSQL>
JWT_SECRET=<generate a strong random string>
PORT=3000

# URLs (update with your actual domains)
FRONTEND_URL=https://app.restocked.now
BACKEND_URL=https://api.restocked.now

# Schedulers (enabled in production by default)
ENABLE_SCHEDULER=true
ENABLE_CHECK_SCHEDULER=true
ENABLE_EMAIL_SCHEDULER=true
CHECK_SCHEDULER_INTERVAL_MINUTES=30
EMAIL_DELIVERY_INTERVAL_MINUTES=5

# Email (optional but recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=notifications@restocked.now
EMAIL_FROM_NAME=Restocked

# App version (optional, defaults to package.json version)
APP_VERSION=1.0.0
```

**Generate JWT_SECRET:**
```bash
# On your local machine
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Configure Build & Start Commands

In Railway project settings → Deploy:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Root Directory:**
```
/ (project root)
```

### Step 5: Run Migrations

After first deployment, run migrations:

**Option A: Via Railway CLI**
```bash
railway run npm run migrate
```

**Option B: Via Railway Shell**
1. Open Railway project
2. Click on your service
3. Click "Shell" tab
4. Run: `npm run migrate`

### Step 6: Seed Production User (Optional)

Create an admin user for testing:

```bash
railway run npm run seed:prod-user
```

Or with custom credentials:
```bash
railway run SEED_USER_EMAIL=admin@restocked.now SEED_USER_PASSWORD=YourSecurePassword123! npm run seed:prod-user
```

### Step 7: Configure Custom Domain (Optional)

1. In Railway project → Settings → Domains
2. Add custom domain: `api.restocked.now`
3. Railway will provide DNS records to add
4. Update `BACKEND_URL` env var to match

### Step 8: Verify Deployment

1. Check Railway logs for successful startup
2. Visit `https://your-railway-url.railway.app/health`
3. Should return JSON with status, version, database, schedulers

---

## Frontend Deployment (Vercel)

### Prerequisites

- Vercel account (https://vercel.com)
- Backend URL from Railway

### Step 1: Import Project

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. **Important:** Set Root Directory to `frontend`

### Step 2: Configure Build Settings

**Framework Preset:** Vite

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```bash
npm install
```

### Step 3: Set Environment Variables

In Vercel project settings → Environment Variables:

```bash
VITE_API_BASE_URL=https://api.restocked.now
```

**Important:** Add this to:
- Production
- Preview (optional, can use staging backend)
- Development (optional, can use localhost)

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Vercel will provide a URL (e.g., `app-restocked-now.vercel.app`)

### Step 5: Configure Custom Domain

1. In Vercel project → Settings → Domains
2. Add domain: `app.restocked.now`
3. Follow DNS configuration instructions
4. SSL will be automatically provisioned

---

## Landing Site Deployment (Vercel)

### Step 1: Create Separate Vercel Project

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import the same GitHub repository
4. **Important:** Set Root Directory to `landing`

### Step 2: Configure Build Settings

**Framework Preset:** Vite

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```bash
npm install
```

### Step 3: Set Environment Variables

No environment variables needed for landing site (it's static).

### Step 4: Configure Custom Domain

1. Add domain: `restocked.now` (or `www.restocked.now`)
2. Follow DNS configuration instructions

### Step 5: Update Landing Site Links (If Needed)

If your app is on a subdomain (`app.restocked.now`), update landing site links:

- `/register` → `https://app.restocked.now/register`
- `/login` → `https://app.restocked.now/login`

Or use environment variables in landing site build if you want dynamic links.

---

## Domain Configuration

### DNS Setup

Assuming you own `restocked.now`:

**A Records / CNAME:**
- `restocked.now` → Vercel (landing site)
- `www.restocked.now` → Vercel (landing site)
- `app.restocked.now` → Vercel (frontend app)
- `api.restocked.now` → Railway (backend)

**Example DNS Records:**
```
Type    Name                    Value
CNAME   restocked.now           cname.vercel-dns.com
CNAME   www.restocked.now       cname.vercel-dns.com
CNAME   app.restocked.now       cname.vercel-dns.com
CNAME   api.restocked.now       <railway-provided-domain>
```

### SSL Certificates

- **Vercel:** Automatic SSL via Let's Encrypt
- **Railway:** Automatic SSL via Railway's proxy

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_ENV` | Yes | - | `production` or `development` |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string (auto-set by Railway) |
| `JWT_SECRET` | Yes | - | Secret for JWT token signing |
| `PORT` | No | `3000` | Server port (Railway sets this automatically) |
| `FRONTEND_URL` | Yes (prod) | `http://localhost:5173` | Frontend app URL |
| `BACKEND_URL` | Yes (prod) | `http://localhost:3000` | Backend API URL |
| `ENABLE_SCHEDULER` | No | `true` (prod) | Enable main scheduler |
| `ENABLE_CHECK_SCHEDULER` | No | `true` (prod) | Enable product check scheduler |
| `ENABLE_EMAIL_SCHEDULER` | No | `true` (prod) | Enable email delivery scheduler |
| `CHECK_SCHEDULER_INTERVAL_MINUTES` | No | `30` | Check scheduler interval |
| `EMAIL_DELIVERY_INTERVAL_MINUTES` | No | `5` | Email delivery interval |
| `RESEND_API_KEY` | No | - | Resend API key for emails |
| `EMAIL_FROM` | No | `notifications@restocked.now` | Email sender address |
| `EMAIL_FROM_NAME` | No | `Restocked` | Email sender name |
| `APP_VERSION` | No | `1.0.0` | App version (from package.json) |

### Frontend (Vercel)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes | `http://localhost:3000` | Backend API URL |

### Landing Site (Vercel)

No environment variables needed.

---

## Post-Deployment Verification

### 1. Backend Health Check

```bash
curl https://api.restocked.now/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "database": "connected",
  "schedulers": {
    "check": {
      "enabled": true,
      "running": false,
      "intervalMinutes": 30
    },
    "email": {
      "enabled": true,
      "running": false,
      "intervalMinutes": 5
    }
  },
  "timestamp": "2025-12-03T..."
}
```

### 2. Test User Login

1. Visit `https://app.restocked.now/login`
2. Login with seeded admin user
3. Verify dashboard loads

### 3. Test Product Addition

1. Add a product URL
2. Verify extraction works
3. Verify product appears in dashboard

### 4. Test Background Checks

1. Wait for scheduler to run (or trigger manually via `/admin/checks/run-now`)
2. Check Railway logs for check execution
3. Verify notifications are created

### 5. Test Notifications

1. Trigger a price/stock change
2. Verify notification appears in `/me/notifications`
3. Verify email is sent (or logged if RESEND_API_KEY not set)

---

## Troubleshooting

### Backend Issues

**Database Connection Failed:**
- Verify `DATABASE_URL` is set correctly in Railway
- Check Railway PostgreSQL service is running
- Test connection: `railway run psql $DATABASE_URL -c "SELECT 1"`

**Schedulers Not Running:**
- Check `ENABLE_CHECK_SCHEDULER` and `ENABLE_EMAIL_SCHEDULER` are set to `true`
- Check Railway logs for scheduler startup messages
- Verify `/health` endpoint shows schedulers as enabled

**CORS Errors:**
- Verify `FRONTEND_URL` matches your actual frontend domain
- Check CORS configuration in `src/api/server.ts`
- Ensure no trailing slashes in URLs

### Frontend Issues

**API Requests Failing:**
- Verify `VITE_API_BASE_URL` is set correctly in Vercel
- Check browser console for CORS errors
- Verify backend is accessible at the URL

**Build Failures:**
- Check Vercel build logs
- Ensure `frontend` directory is set as root
- Verify all dependencies are in `package.json`

### Migration Issues

**Migrations Not Running:**
- Run manually: `railway run npm run migrate`
- Check `schema_migrations` table exists
- Verify database connection

---

## Security Checklist

- [ ] `JWT_SECRET` is a strong random string (64+ characters)
- [ ] `DATABASE_URL` is not exposed in logs or frontend
- [ ] CORS is configured to only allow production frontend URL
- [ ] Admin routes require authentication and admin role
- [ ] Rate limiting is enabled on API endpoints
- [ ] Environment variables are not committed to git
- [ ] SSL certificates are valid (automatic on Vercel/Railway)

---

## Rotating JWT_SECRET

If you need to rotate `JWT_SECRET`:

1. **Generate new secret:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Update in Railway:**
   - Go to project → Variables
   - Update `JWT_SECRET` value
   - Redeploy service

3. **Note:** All existing user sessions will be invalidated. Users will need to log in again.

---

## Monitoring

### Railway Logs

- View logs in Railway dashboard
- Set up alerts for errors
- Monitor memory usage (especially for product extraction)

### Vercel Analytics

- Enable Vercel Analytics in project settings
- Monitor page views, performance, errors

### Health Checks

- Set up external monitoring (e.g., UptimeRobot) to ping `/health`
- Alert on status != "ok"

---

## Next Steps

After successful deployment:

1. Set up monitoring and alerts
2. Configure backup strategy for database
3. Set up error tracking (e.g., Sentry)
4. Configure CDN for static assets (Vercel handles this)
5. Set up staging environment for testing

