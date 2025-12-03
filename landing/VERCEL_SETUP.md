# Vercel Deployment Setup

## Repository Information

**GitHub Repository:** https://github.com/YOUR_USERNAME/restocked-landing

## Vercel Settings

### Project Configuration

1. **Framework Preset:** Vite
2. **Root Directory:** `/` (root of repository)
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Install Command:** `npm install`

### Environment Variables

**Optional (only if app is on subdomain):**
- `VITE_APP_URL` = `https://app.restocked.now`

If your app and landing are on the same domain, you can leave this empty.

### Domain Configuration

1. Add custom domain: `restocked.now`
2. Follow Vercel's DNS configuration instructions
3. SSL certificate will be automatically provisioned

## Deployment Steps

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import repository: `restocked-landing`
4. Configure settings as above
5. Deploy!

