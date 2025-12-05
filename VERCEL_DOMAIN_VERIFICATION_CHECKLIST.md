# Vercel Domain Configuration Verification Checklist

**Date:** 2025-12-05  
**Purpose:** Verify domain routing is correct

---

## Expected Configuration

### ✅ Correct Setup

1. **Landing Project:**
   - **Domain:** `restocked.now`
   - **Root Directory:** `landing`
   - **Build Output:** `landing/dist/`

2. **Frontend Project:**
   - **Domain:** `app.restocked.now`
   - **Root Directory:** `frontend`
   - **Build Output:** `frontend/dist/`

---

## Verification Steps in Vercel Dashboard

### Step 1: Check Landing Project (`restocked.now`)

1. **Go to Vercel Dashboard:**
   - Navigate to: https://vercel.com/dashboard
   - Find the project that has `restocked.now` as a domain

2. **Verify Project Settings:**
   - Click on the project
   - Go to **Settings** → **General**
   - Check **Root Directory:**
     - ✅ Should be: `landing`
     - ❌ Should NOT be: `frontend` or empty

3. **Verify Domain Assignment:**
   - Go to **Settings** → **Domains**
   - Check listed domains:
     - ✅ `restocked.now` should be listed
     - ✅ Status should be "Valid" or "Active"
     - ❌ `app.restocked.now` should NOT be listed here

4. **Verify Build Configuration:**
   - Go to **Settings** → **Build & Development Settings**
   - Check **Root Directory:**
     - ✅ Should be: `landing`
   - Check **Build Command:**
     - ✅ Should be: `npm run build` (or auto-detected)
   - Check **Output Directory:**
     - ✅ Should be: `dist`

5. **Check Recent Deployments:**
   - Go to **Deployments** tab
   - Check latest deployment
   - Verify build logs show:
     - ✅ Building from `landing/` directory
     - ✅ Running `npm install` in `landing/`
     - ✅ Running `npm run build` in `landing/`
     - ✅ Output in `landing/dist/`

---

### Step 2: Check Frontend Project (`app.restocked.now`)

1. **Go to Vercel Dashboard:**
   - Navigate to: https://vercel.com/dashboard
   - Find the project that has `app.restocked.now` as a domain

2. **Verify Project Settings:**
   - Click on the project
   - Go to **Settings** → **General**
   - Check **Root Directory:**
     - ✅ Should be: `frontend`
     - ❌ Should NOT be: `landing` or empty

3. **Verify Domain Assignment:**
   - Go to **Settings** → **Domains**
   - Check listed domains:
     - ✅ `app.restocked.now` should be listed
     - ✅ Status should be "Valid" or "Active"
     - ❌ `restocked.now` should NOT be listed here

4. **Verify Build Configuration:**
   - Go to **Settings** → **Build & Development Settings**
   - Check **Root Directory:**
     - ✅ Should be: `frontend`
   - Check **Build Command:**
     - ✅ Should be: `npm run build` (or auto-detected)
   - Check **Output Directory:**
     - ✅ Should be: `dist`

5. **Check Recent Deployments:**
   - Go to **Deployments** tab
   - Check latest deployment
   - Verify build logs show:
     - ✅ Building from `frontend/` directory
     - ✅ Running `npm install` in `frontend/`
     - ✅ Running `npm run build` in `frontend/`
     - ✅ Output in `frontend/dist/`

---

### Step 3: Verify No Cross-Contamination

**Critical Check:** Ensure `restocked.now` does NOT point to frontend project

1. **Check Landing Project:**
   - Go to project with `restocked.now` domain
   - **Settings** → **General** → **Root Directory**
   - ✅ Must be: `landing`
   - ❌ Must NOT be: `frontend`

2. **Check All Projects:**
   - List all projects in Vercel dashboard
   - For each project, check:
     - Domain assignments
     - Root directory settings
   - Verify:
     - ✅ Only ONE project has `restocked.now`
     - ✅ That project has Root Directory = `landing`
     - ✅ Only ONE project has `app.restocked.now`
     - ✅ That project has Root Directory = `frontend`

---

## Repository Configuration Files

### Current State

**Frontend vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Location:** `frontend/vercel.json`

**Status:** ✅ Correct - This file is in `frontend/` directory, so it only affects the frontend project if Root Directory is set to `frontend`.

**Note:** This file does NOT affect the landing project because:
- Landing project should have Root Directory = `landing`
- Vercel only reads `vercel.json` from the root directory specified in project settings
- If Root Directory = `landing`, Vercel won't see `frontend/vercel.json`

---

## Troubleshooting

### Issue: `restocked.now` Shows Frontend Login Page

**Symptom:** Visiting `https://restocked.now` shows the app login page instead of landing page.

**Possible Causes:**
1. **Wrong Root Directory:**
   - Landing project has Root Directory = `frontend` (WRONG)
   - **Fix:** Change Root Directory to `landing`

2. **Wrong Domain Assignment:**
   - `restocked.now` is assigned to frontend project (WRONG)
   - **Fix:** Remove `restocked.now` from frontend project, add to landing project

3. **Single Project Misconfiguration:**
   - Only one project exists, and it's configured for frontend
   - **Fix:** Create separate landing project with Root Directory = `landing`

**Verification Steps:**
1. Go to project with `restocked.now` domain
2. Check **Settings** → **General** → **Root Directory**
3. If it says `frontend`, change it to `landing`
4. Redeploy the project

---

### Issue: `app.restocked.now` Shows Landing Page

**Symptom:** Visiting `https://app.restocked.now` shows landing page instead of app.

**Possible Causes:**
1. **Wrong Root Directory:**
   - Frontend project has Root Directory = `landing` (WRONG)
   - **Fix:** Change Root Directory to `frontend`

2. **Wrong Domain Assignment:**
   - `app.restocked.now` is assigned to landing project (WRONG)
   - **Fix:** Remove `app.restocked.now` from landing project, add to frontend project

**Verification Steps:**
1. Go to project with `app.restocked.now` domain
2. Check **Settings** → **General** → **Root Directory**
3. If it says `landing`, change it to `frontend`
4. Redeploy the project

---

## Quick Verification Commands

### Test Domain Routing

```bash
# Test landing page
curl -I https://restocked.now
# Should return 200 OK
# Should serve landing page HTML (Hero, Features, Pricing sections)

# Test app login page
curl -I https://app.restocked.now/login
# Should return 200 OK
# Should serve app login page HTML (Email, Password fields)
```

### Check What's Actually Served

```bash
# Get landing page content
curl https://restocked.now | head -50
# Should show landing page content (Hero section, etc.)
# Should NOT show login form

# Get app login page content
curl https://app.restocked.now/login | head -50
# Should show login form (Email, Password fields)
# Should NOT show landing page content
```

---

## Summary Checklist

- [ ] Landing project exists with Root Directory = `landing`
- [ ] Landing project has domain `restocked.now` assigned
- [ ] Frontend project exists with Root Directory = `frontend`
- [ ] Frontend project has domain `app.restocked.now` assigned
- [ ] `restocked.now` does NOT point to frontend project
- [ ] `app.restocked.now` does NOT point to landing project
- [ ] Both projects build successfully
- [ ] `restocked.now` serves landing page content
- [ ] `app.restocked.now/login` serves login page content

---

## Action Items

**If verification fails:**

1. **Fix Root Directory:**
   - Landing project → Settings → General → Root Directory = `landing`
   - Frontend project → Settings → General → Root Directory = `frontend`

2. **Fix Domain Assignments:**
   - Remove incorrect domain assignments
   - Add correct domains to correct projects

3. **Redeploy:**
   - Trigger new deployment after fixing settings
   - Verify build logs show correct root directory

4. **Test:**
   - Visit `https://restocked.now` → Should show landing page
   - Visit `https://app.restocked.now/login` → Should show login page

---

**Note:** I cannot directly access your Vercel dashboard. Please follow the checklist above to verify the configuration manually.
