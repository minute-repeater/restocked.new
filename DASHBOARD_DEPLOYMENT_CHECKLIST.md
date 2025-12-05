# Dashboard Deployment Checklist

**Quick Reference for Deploying `app.restocked.now`**

---

## 🚀 Deployment Steps (15 minutes)

### 1. Vercel Project Setup (5 min)

- [ ] Go to https://vercel.com/dashboard → "Add New" → "Project"
- [ ] Import repository: `restocked-now`
- [ ] **Root Directory:** `frontend` ⚠️ CRITICAL
- [ ] **Build Command:** `npm run build`
- [ ] **Output Directory:** `dist`
- [ ] **Framework:** Vite (auto-detected)

### 2. Environment Variable (1 min)

- [ ] Add environment variable:
  - **Name:** `VITE_API_BASE_URL`
  - **Value:** `https://YOUR_RAILWAY_BACKEND_URL`
  - **Environments:** Production, Preview, Development

**Find Railway URL:**
- Railway Dashboard → Your Service → Copy URL
- Or use: `https://api.restocked.now` (if configured)

### 3. Deploy (2 min)

- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Note Vercel URL (e.g., `restocked-dashboard.vercel.app`)

### 4. Add Domain (2 min)

- [ ] Vercel Project → Settings → Domains
- [ ] Add domain: `app.restocked.now`
- [ ] Copy CNAME value shown by Vercel

### 5. DNS Configuration (3 min)

- [ ] Namecheap → Domain List → `restocked.now` → Manage → Advanced DNS
- [ ] Add CNAME Record:
  - **Host:** `app`
  - **Value:** `<vercel-cname-value>`
  - **TTL:** Automatic
- [ ] Save changes

### 6. Backend Configuration (2 min)

- [ ] Railway Dashboard → Your Service → Variables
- [ ] Set: `FRONTEND_URL=https://app.restocked.now`
- [ ] Backend will auto-redeploy

---

## ✅ Verification (5 min)

### Immediate Checks

- [ ] Vercel deployment shows "Ready"
- [ ] Vercel URL loads: `https://restocked-dashboard.vercel.app`
- [ ] Railway variable `FRONTEND_URL` is set

### After DNS Propagation (5-60 min)

- [ ] Check DNS: https://www.whatsmydns.net/#CNAME/app.restocked.now
- [ ] Visit: `https://app.restocked.now`
- [ ] Should load dashboard login page
- [ ] Check browser console (F12) - no CORS errors

### End-to-End Testing

- [ ] **Registration:** `https://app.restocked.now/register` → Create account
- [ ] **Login:** `https://app.restocked.now/login` → Login works
- [ ] **Dashboard:** After login, see dashboard
- [ ] **Add Product:** Add product URL → Extraction works
- [ ] **Notifications:** Check notifications page loads

---

## 🔧 Quick Troubleshooting

### Build Fails
- Check Vercel build logs
- Verify `cd frontend && npm run build` works locally

### Domain Not Loading
- Wait 5-60 min for DNS propagation
- Verify CNAME record in Namecheap
- Check Vercel domain settings

### CORS Errors
- Verify `VITE_API_BASE_URL` is correct
- Verify `FRONTEND_URL` in Railway matches `https://app.restocked.now`
- Check Railway logs for CORS errors

### API Connection Fails
- Test backend: `curl https://YOUR_RAILWAY_URL/health`
- Check `VITE_API_BASE_URL` in Vercel
- Verify backend is running in Railway

---

## 📋 Configuration Summary

### Vercel Settings
```
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Environment Variable: VITE_API_BASE_URL=https://YOUR_RAILWAY_URL
```

### Railway Variable
```
FRONTEND_URL=https://app.restocked.now
```

### DNS (Namecheap)
```
Type: CNAME
Host: app
Value: <vercel-cname>
```

---

## 🎯 Success Criteria

✅ `app.restocked.now` loads dashboard  
✅ Registration works  
✅ Login works  
✅ Product extraction works  
✅ No CORS errors in browser console  
✅ API calls succeed  

---

**Ready to deploy?** Follow steps 1-6 above, then verify! 🚀

