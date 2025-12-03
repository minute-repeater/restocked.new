# Vercel Deployment Setup

This document provides exact Vercel settings for deploying both the frontend app and landing site from the monorepo.

## Repository

**GitHub Repository:** https://github.com/minute-repeater/restocked.new

## Landing Site Deployment

### Project 1: Landing Site (restocked.now)

**Vercel Settings:**

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `landing` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

**Environment Variables (Optional):**
- `VITE_APP_URL` = `https://app.restocked.now` (only if app is on subdomain)

**Custom Domain:**
- `restocked.now`
- `www.restocked.now` (optional)

**Steps:**
1. Go to Vercel → Add New → Project
2. Import repository: `minute-repeater/restocked.new`
3. Configure:
   - Root Directory: `landing`
   - Framework: Vite (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable `VITE_APP_URL` if needed
5. Deploy
6. Add custom domain: `restocked.now`

---

## Frontend App Deployment

### Project 2: Frontend Dashboard (app.restocked.now)

**Vercel Settings:**

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

**Environment Variables (Required):**
- `VITE_API_BASE_URL` = `https://api.restocked.now` (or your Railway backend URL)

**Custom Domain:**
- `app.restocked.now`

**Steps:**
1. Go to Vercel → Add New → Project
2. Import the same repository: `minute-repeater/restocked.new`
3. Configure:
   - Root Directory: `frontend`
   - Framework: Vite (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   - `VITE_API_BASE_URL` = Your backend API URL
5. Deploy
6. Add custom domain: `app.restocked.now`

---

## Important Notes

### Monorepo Structure

Since this is a monorepo, you need to create **two separate Vercel projects**:
1. One for `landing/` → `restocked.now`
2. One for `frontend/` → `app.restocked.now`

Both projects import the same GitHub repository but use different root directories.

### Build Process

Vercel will:
1. Clone the repository
2. Navigate to the specified root directory (`landing` or `frontend`)
3. Run `npm install` in that directory
4. Run `npm run build`
5. Serve files from `dist/`

### Environment Variables

- **Landing:** Only needs `VITE_APP_URL` if app is on a subdomain
- **Frontend:** Requires `VITE_API_BASE_URL` (backend API URL)

### Custom Domains

- Landing: `restocked.now` (main domain)
- Frontend: `app.restocked.now` (subdomain)
- Backend: `api.restocked.now` (Railway, not Vercel)

---

## Verification

After deployment:

1. **Landing Site:**
   ```bash
   curl -I https://restocked.now
   ```
   Should return `200 OK`

2. **Frontend App:**
   ```bash
   curl -I https://app.restocked.now
   ```
   Should return `200 OK`

3. **Check Build Logs:**
   - In Vercel dashboard, check deployment logs
   - Ensure build completes without errors
   - Verify `dist/` folder is created

---

## Troubleshooting

### Build Fails

**Issue:** Build command fails
**Solution:** 
- Check that root directory is correct (`landing` or `frontend`)
- Verify `package.json` exists in that directory
- Check build logs for specific errors

### Environment Variables Not Working

**Issue:** `import.meta.env.VITE_*` is undefined
**Solution:**
- Ensure variable name starts with `VITE_`
- Redeploy after adding environment variables
- Check Vercel project settings → Environment Variables

### Wrong Files Deployed

**Issue:** Landing shows frontend or vice versa
**Solution:**
- Verify Root Directory setting in Vercel
- Should be `landing` for landing site
- Should be `frontend` for app

---

**Last Updated:** 2025-12-03

