# Railway Project Audit - Manual Steps Required

**Status:** Railway CLI installed, authentication required

---

## ⚠️ Authentication Required

The Railway CLI needs to be authenticated. Please run:

```bash
railway login
```

This will open a browser window for authentication. After logging in, return here.

---

## After Authentication - Run These Commands

Once authenticated, I can run:

```bash
# List all projects
railway list

# Link to specific project (if needed)
railway link

# Check project status
railway status

# View services
railway service list

# Check environment variables
railway variables

# View logs
railway logs

# Get public domain
railway domain
```

---

## Manual Dashboard Checks (Alternative)

If CLI authentication is not possible, please check manually in Railway Dashboard:

### 1. Project Services
- Go to: https://railway.app/dashboard
- Find project: `restocked-new-production` (or similar)
- Check services:
  - [ ] Node.js backend service exists
  - [ ] PostgreSQL database service exists

### 2. PostgreSQL Database
- If PostgreSQL does NOT exist:
  - Click "+ New" → "Database" → "PostgreSQL"
  - Wait for deployment
  - Verify `DATABASE_URL` is auto-set

### 3. Backend Service
- Go to Node.js service → Deployments
- Check latest deployment status
- If needed, click "Deploy latest"

### 4. Public Domain
- Go to Node.js service → Settings → Networking
- Copy Public Domain URL
- Format: `https://[service-name].up.railway.app`

### 5. Environment Variables
- Go to Node.js service → Variables
- Verify:
  - `DATABASE_URL` is set (auto-set by PostgreSQL)
  - `APP_ENV=production`
  - `JWT_SECRET` is set
  - `FRONTEND_URL=https://app.restocked.now`
  - `BACKEND_URL` is set

### 6. Logs
- Go to Node.js service → Deployments → Latest → View Logs
- Check for:
  - `Database connected`
  - `Server running on port XXXX`
  - `Scheduler started`
  - Any errors

---

## Report Back With:

- [ ] Current services in project (Node.js + PostgreSQL?)
- [ ] Whether PostgreSQL exists
- [ ] Whether DATABASE_URL is set
- [ ] Public backend URL
- [ ] Latest deployment status
- [ ] Any errors from logs

---

**Next Steps:**
1. Authenticate Railway CLI: `railway login`
2. Or check manually in Railway Dashboard
3. Report findings back



