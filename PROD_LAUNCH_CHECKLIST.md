# Production Launch Checklist

Use this checklist to ensure a smooth production deployment of Restocked.now.

## Pre-Deployment

### Code & Configuration

- [ ] All code changes committed and pushed to main branch
- [ ] `src/config.ts` properly configured for production
- [ ] All environment variables documented in `DEPLOYMENT.md`
- [ ] Frontend `.env.production.example` created
- [ ] Migration scripts tested locally
- [ ] Seed script tested locally

### Database

- [ ] Database migrations reviewed and tested
- [ ] `scripts/run-migrations.ts` works correctly
- [ ] `scripts/seed-prod-user.ts` works correctly
- [ ] Backup strategy planned (Railway provides automatic backups)

### Security

- [ ] `JWT_SECRET` generated (64+ character random string)
- [ ] All secrets stored in Railway/Vercel (not in code)
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled on API endpoints
- [ ] Admin routes protected

---

## Backend Deployment (Railway)

### Initial Setup

- [ ] Railway account created
- [ ] PostgreSQL database added to Railway project
- [ ] `DATABASE_URL` automatically set by Railway
- [ ] All environment variables set in Railway:
  - [ ] `APP_ENV=production`
  - [ ] `JWT_SECRET` (strong random string)
  - [ ] `FRONTEND_URL` (e.g., `https://app.restocked.now`)
  - [ ] `BACKEND_URL` (e.g., `https://api.restocked.now`)
  - [ ] `ENABLE_SCHEDULER=true`
  - [ ] `ENABLE_CHECK_SCHEDULER=true`
  - [ ] `ENABLE_EMAIL_SCHEDULER=true`
  - [ ] `RESEND_API_KEY` (if using email)
  - [ ] `EMAIL_FROM` and `EMAIL_FROM_NAME`

### Build & Deploy

- [ ] Build command set: `npm install && npm run build`
- [ ] Start command set: `npm start`
- [ ] Root directory set to `/` (project root)
- [ ] First deployment successful
- [ ] No build errors in Railway logs

### Database Setup

- [ ] Migrations run successfully: `railway run npm run migrate`
- [ ] All tables created (verify in Railway PostgreSQL)
- [ ] Production user seeded: `railway run npm run seed:prod-user`
- [ ] Test user credentials saved securely

### Verification

- [ ] Health endpoint accessible: `https://api.restocked.now/health`
- [ ] Health endpoint returns:
  - [ ] `status: "ok"`
  - [ ] `database: "connected"`
  - [ ] `schedulers.check.enabled: true`
  - [ ] `schedulers.email.enabled: true`
- [ ] Railway logs show no errors
- [ ] Schedulers started successfully (check logs)

### Custom Domain (Optional)

- [ ] Custom domain added in Railway: `api.restocked.now`
- [ ] DNS records configured
- [ ] SSL certificate provisioned (automatic)
- [ ] `BACKEND_URL` updated to match custom domain

---

## Frontend Deployment (Vercel)

### Initial Setup

- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Project created with root directory: `frontend`
- [ ] Framework preset: Vite

### Build Configuration

- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Install command: `npm install`

### Environment Variables

- [ ] `VITE_API_BASE_URL` set to backend URL (e.g., `https://api.restocked.now`)
- [ ] Environment variable added to Production environment
- [ ] Environment variable added to Preview environment (optional)

### Deploy

- [ ] First deployment successful
- [ ] No build errors in Vercel logs
- [ ] Frontend accessible at Vercel URL

### Custom Domain

- [ ] Custom domain added: `app.restocked.now`
- [ ] DNS records configured
- [ ] SSL certificate provisioned (automatic)
- [ ] Domain verified and active

---

## Landing Site Deployment (Vercel)

### Initial Setup

- [ ] Separate Vercel project created
- [ ] Root directory set to: `landing`
- [ ] Framework preset: Vite

### Build Configuration

- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Install command: `npm install`

### Deploy

- [ ] First deployment successful
- [ ] Landing site accessible at Vercel URL

### Custom Domain

- [ ] Custom domain added: `restocked.now` (or `www.restocked.now`)
- [ ] DNS records configured
- [ ] SSL certificate provisioned
- [ ] Domain verified and active

### Link Updates

- [ ] Landing site CTAs point to app domain (`app.restocked.now`)
- [ ] `/register` and `/login` links work correctly
- [ ] All internal links tested

---

## Post-Deployment Testing

### Authentication

- [ ] Can register new user at `https://app.restocked.now/register`
- [ ] Can login with seeded admin user
- [ ] JWT tokens work correctly
- [ ] Protected routes require authentication
- [ ] Logout works correctly

### Product Management

- [ ] Can add product via URL
- [ ] Product extraction works (name, image extracted)
- [ ] Product appears in dashboard
- [ ] Product details page loads
- [ ] Variants display correctly

### Background Checks

- [ ] Check scheduler running (check Railway logs)
- [ ] Manual check works: `POST /admin/checks/run-now`
- [ ] Changes detected correctly
- [ ] Notifications created on changes
- [ ] Email delivery working (or logging if no API key)

### Notifications

- [ ] Notifications appear in `/me/notifications`
- [ ] Unread count updates correctly
- [ ] Mark as read works
- [ ] Email notifications sent (or logged)

### API Endpoints

- [ ] `GET /health` returns correct status
- [ ] `GET /me/tracked-items` works
- [ ] `POST /products` works
- [ ] `GET /products/:id` works
- [ ] Admin endpoints require admin role

---

## Monitoring & Alerts

### Health Monitoring

- [ ] External health check service configured (e.g., UptimeRobot)
- [ ] Alerts set up for `/health` endpoint failures
- [ ] Database connection monitoring enabled

### Logs

- [ ] Railway logs accessible and monitored
- [ ] Vercel logs accessible
- [ ] Error tracking configured (optional: Sentry)

### Performance

- [ ] Response times acceptable (< 2s for API calls)
- [ ] Frontend loads quickly (< 3s first load)
- [ ] No memory leaks (monitor Railway metrics)

---

## Security Verification

- [ ] All API endpoints require authentication (except `/health`, `/auth/*`)
- [ ] CORS only allows production frontend domain
- [ ] Rate limiting active on API endpoints
- [ ] No sensitive data in logs
- [ ] SSL certificates valid (automatic on Vercel/Railway)
- [ ] Database credentials secure (not exposed)

---

## Documentation

- [ ] `DEPLOYMENT.md` updated with actual deployment URLs
- [ ] Environment variables documented
- [ ] Migration process documented
- [ ] Troubleshooting guide available
- [ ] Team has access to deployment credentials

---

## Rollback Plan

- [ ] Know how to rollback Railway deployment (previous version)
- [ ] Know how to rollback Vercel deployment (previous deployment)
- [ ] Database migration rollback plan (if needed)
- [ ] Backup strategy in place

---

## Final Sign-Off

- [ ] All checklist items completed
- [ ] Production environment stable
- [ ] All critical features working
- [ ] Team notified of production launch
- [ ] Monitoring and alerts configured

---

## Post-Launch

### First 24 Hours

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Check scheduler execution
- [ ] Verify email delivery
- [ ] Review user registrations

### First Week

- [ ] Review performance metrics
- [ ] Check for any errors or issues
- [ ] Gather user feedback
- [ ] Optimize based on usage patterns

---

## Emergency Contacts

- **Railway Support:** https://railway.app/help
- **Vercel Support:** https://vercel.com/support
- **Database Issues:** Check Railway PostgreSQL logs
- **API Issues:** Check Railway service logs
- **Frontend Issues:** Check Vercel deployment logs

---

## Quick Commands Reference

```bash
# Run migrations
railway run npm run migrate

# Seed production user
railway run npm run seed:prod-user

# Check health
curl https://api.restocked.now/health

# Trigger manual check
curl -X POST https://api.restocked.now/admin/checks/run-now \
  -H "Authorization: Bearer <admin-token>"

# View Railway logs
railway logs

# View Vercel logs
# (via Vercel dashboard)
```

---

**Last Updated:** 2025-12-03
**Version:** 1.0.0

