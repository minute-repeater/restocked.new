# Dashboard App Deployment Guide

**Status:** Ready to deploy  
**Target:** `app.restocked.now`  
**Date:** December 2025

---

## 🎯 Overview

Deploy the frontend dashboard application from the monorepo to Vercel and connect it to the production backend on Railway.

**Prerequisites:**
- ✅ Landing site deployed at `restocked.now`
- ✅ GitHub repository configured
- ✅ Railway backend deployed
- ✅ DNS configured for landing site

---

## 📋 Step-by-Step Deployment

### Step 1: Create Vercel Project for Dashboard

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Click **"Add New..."** → **"Project"**

2. **Import Repository**
   - Search for your repository: `restocked-now`
   - Click **"Import"**

3. **Configure Project Settings**
   
   **Project Name:** `restocked-dashboard` (or your preferred name)
   
   **Framework Preset:** Vite (should auto-detect)
   
   **Root Directory:** 
   ```
   frontend
   ```
   ⚠️ **CRITICAL:** Set this to `frontend` (not root `/`)
   
   **Build Command:**
   ```
   npm run build
   ```
   
   **Output Directory:**
   ```
   dist
   ```
   
   **Install Command:**
   ```
   npm install
   ```

4. **Environment Variables**
   
   Click **"Environment Variables"** and add:
   
   | Name | Value | Environment |
   |------|-------|-------------|
   | `VITE_API_BASE_URL` | `https://YOUR_RAILWAY_BACKEND_URL` | Production, Preview, Development |
   
   **To find your Railway backend URL:**
   - Go to Railway dashboard
   - Select your backend service
   - Copy the Railway-provided URL (e.g., `https://your-app.up.railway.app`)
   - Or use your custom domain: `https://api.restocked.now` (if configured)
   
   ⚠️ **Important:** Use `https://` (not `http://`)

5. **Deploy**
   - Click **"Deploy"**
   - Wait for build to complete
   - Note the Vercel-provided URL (e.g., `https://restocked-dashboard.vercel.app`)

---

### Step 2: Add Custom Domain

1. **In Vercel Project Settings**
   - Go to **Settings** → **Domains**
   - Click **"Add Domain"**

2. **Enter Domain**
   ```
   app.restocked.now
   ```
   - Click **"Add"**

3. **Vercel will show DNS instructions**
   - You'll see a CNAME record to add
   - Example: `cname.vercel-dns.com` or similar
   - **Copy this value** (you'll need it for DNS)

---

### Step 3: Configure DNS (Namecheap)

1. **Go to Namecheap DNS Management**
   - Log in to Namecheap
   - Go to Domain List → `restocked.now` → Manage → Advanced DNS

2. **Add CNAME Record**
   
   **Type:** CNAME Record
   
   **Host:** `app`
   
   **Value:** `<your-vercel-project>.vercel-dns.com` (from Step 2)
   
   **TTL:** Automatic (or 300)
   
   **Example:**
   ```
   Type: CNAME
   Host: app
   Value: cname.vercel-dns.com
   TTL: Automatic
   ```

3. **Save Changes**
   - Click **"Save all changes"**
   - DNS propagation can take 5-60 minutes

---

### Step 4: Update Railway Backend Configuration

1. **Go to Railway Dashboard**
   - Select your backend service
   - Go to **Variables** tab

2. **Update Environment Variable**
   
   Find or add:
   ```
   FRONTEND_URL=https://app.restocked.now
   ```
   
   ⚠️ **Important:** 
   - Use `https://` (not `http://`)
   - Use the exact domain: `app.restocked.now`
   - This enables CORS for the frontend

3. **Verify CORS Configuration**
   
   The backend should automatically allow requests from `FRONTEND_URL`.
   Check `src/api/middleware/cors.ts` or similar to confirm CORS is configured.

4. **Redeploy Backend (if needed)**
   - If you changed `FRONTEND_URL`, Railway should auto-redeploy
   - Or manually trigger a redeploy

---

### Step 5: Verify Deployment

#### 5.1 Check Vercel Deployment

1. **Verify Build Success**
   - Go to Vercel project → **Deployments**
   - Latest deployment should show **"Ready"** status
   - Check build logs for any errors

2. **Test Vercel URL**
   - Visit: `https://restocked-dashboard.vercel.app` (or your Vercel URL)
   - Should load the dashboard login page
   - Check browser console for API connection errors

#### 5.2 Check DNS Propagation

1. **Wait for DNS**
   - DNS changes can take 5-60 minutes
   - Check propagation: https://www.whatsmydns.net/#CNAME/app.restocked.now

2. **Test Custom Domain**
   - Visit: `https://app.restocked.now`
   - Should load the dashboard (may take a few minutes after DNS propagates)

#### 5.3 Test Backend Connection

1. **Check Browser Console**
   - Open `https://app.restocked.now`
   - Open Developer Tools → Console
   - Look for API connection errors
   - Should see successful API calls (or auth redirects)

2. **Test Health Endpoint**
   ```bash
   curl https://YOUR_RAILWAY_BACKEND_URL/health
   ```
   Should return: `{"status":"ok"}`

---

### Step 6: End-to-End Testing

#### 6.1 Authentication Flow

1. **Test Registration**
   - Go to: `https://app.restocked.now/register`
   - Create a new account
   - Should redirect to dashboard after registration

2. **Test Login**
   - Go to: `https://app.restocked.now/login`
   - Login with test credentials
   - Should redirect to dashboard

3. **Test Logout**
   - Click logout
   - Should redirect to login page

#### 6.2 Product Tracking

1. **Add Product**
   - Click "Add Product" or similar
   - Enter a product URL (e.g., from a test site)
   - Should extract product details
   - Product should appear in dashboard

2. **View Product Details**
   - Click on a tracked product
   - Should show product details, variants, price history

3. **Test Variant Limits**
   - Free plan: Should limit to 3 variants per product
   - Pro plan: Should allow unlimited variants
   - Test upgrade flow if applicable

#### 6.3 Notifications

1. **Check Notifications**
   - Go to notifications page
   - Should show notification list (may be empty initially)

2. **Trigger Manual Check** (Admin)
   ```bash
   curl -X POST https://YOUR_RAILWAY_BACKEND_URL/admin/checks/run-now \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

3. **Verify Notifications Created**
   - After check runs, refresh notifications
   - Should see new notifications if changes detected

---

## 🔧 Troubleshooting

### Issue: Build Fails on Vercel

**Symptoms:** Deployment shows "Build Failed"

**Solutions:**
1. Check build logs in Vercel dashboard
2. Verify `package.json` has correct build script: `"build": "tsc -b && vite build"`
3. Check for TypeScript errors: `cd frontend && npm run build` locally
4. Verify all dependencies are in `package.json` (not just `package-lock.json`)

### Issue: Domain Not Resolving

**Symptoms:** `app.restocked.now` shows "Site not found" or timeout

**Solutions:**
1. Verify DNS CNAME record is correct in Namecheap
2. Check DNS propagation: https://www.whatsmydns.net/#CNAME/app.restocked.now
3. Verify domain is added in Vercel → Settings → Domains
4. Wait up to 60 minutes for DNS propagation

### Issue: API Connection Errors

**Symptoms:** Browser console shows CORS errors or connection refused

**Solutions:**
1. Verify `VITE_API_BASE_URL` is set correctly in Vercel
2. Check Railway backend is running: `curl https://YOUR_RAILWAY_URL/health`
3. Verify `FRONTEND_URL` in Railway matches `https://app.restocked.now`
4. Check Railway logs for CORS errors
5. Verify backend CORS middleware allows the frontend domain

### Issue: Login/Registration Fails

**Symptoms:** Forms submit but show errors or don't redirect

**Solutions:**
1. Check browser console for API errors
2. Verify `VITE_API_BASE_URL` points to correct backend
3. Test backend auth endpoint directly:
   ```bash
   curl -X POST https://YOUR_RAILWAY_URL/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```
4. Check Railway logs for auth errors

### Issue: Product Extraction Fails

**Symptoms:** Adding product URL shows error or hangs

**Solutions:**
1. Check Railway logs for extraction errors
2. Verify backend has sufficient memory (Railway plan)
3. Test extraction endpoint directly:
   ```bash
   curl -X POST https://YOUR_RAILWAY_URL/products \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com/product"}'
   ```
4. Check for memory issues in Railway logs

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Railway backend is deployed and accessible
- [ ] Backend health endpoint works: `curl https://YOUR_RAILWAY_URL/health`
- [ ] Frontend builds locally: `cd frontend && npm run build`
- [ ] Railway backend URL is known

### Vercel Deployment
- [ ] Vercel project created
- [ ] Root directory set to `frontend`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variable `VITE_API_BASE_URL` set
- [ ] First deployment successful
- [ ] Vercel URL accessible

### Domain Configuration
- [ ] Custom domain `app.restocked.now` added in Vercel
- [ ] CNAME record added in Namecheap DNS
- [ ] DNS propagated (check with whatsmydns.net)
- [ ] `app.restocked.now` loads dashboard

### Backend Configuration
- [ ] `FRONTEND_URL=https://app.restocked.now` set in Railway
- [ ] Backend redeployed (if needed)
- [ ] CORS allows frontend domain

### Testing
- [ ] Dashboard loads at `app.restocked.now`
- [ ] Registration works
- [ ] Login works
- [ ] Logout works
- [ ] Add product works
- [ ] Product extraction works
- [ ] Variant limits enforced (free plan)
- [ ] Notifications page loads
- [ ] Admin "Run Now" check works

---

## 📊 Post-Deployment Monitoring

### First 24 Hours

1. **Monitor Error Rates**
   - Check Vercel logs for build errors
   - Check Railway logs for API errors
   - Monitor browser console errors (via user reports or analytics)

2. **Monitor Performance**
   - Check Vercel analytics for page load times
   - Monitor Railway metrics for API response times
   - Check for memory issues in Railway

3. **Test Critical Flows**
   - User registration
   - Product tracking
   - Notifications
   - Background checks

### Ongoing

- Monitor Railway logs for extraction failures
- Check Vercel deployments for build issues
- Monitor DNS health
- Track user-reported issues

---

## 🚀 Quick Reference

### Vercel Project Settings
```
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Framework: Vite
```

### Environment Variables
```
VITE_API_BASE_URL=https://YOUR_RAILWAY_BACKEND_URL
```

### DNS Record (Namecheap)
```
Type: CNAME
Host: app
Value: <vercel-provided-value>
TTL: Automatic
```

### Railway Variable
```
FRONTEND_URL=https://app.restocked.now
```

---

## 📞 Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **Namecheap DNS:** https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-do-i-set-up-an-a-record-or-cname-record-for-my-domain/
- **DNS Propagation Check:** https://www.whatsmydns.net

---

**Last Updated:** December 2025  
**Status:** Ready for deployment

