# Phase 1 & Phase 2 Implementation Plan

**Date:** December 4, 2025  
**Status:** 🎯 **WAYPOINT ACHIEVED** - Ready for Stability & Feature Development  
**Foundation:** ✅ Live, Stable, Authenticated, Connected

---

## 🎉 Waypoint Acknowledgment

**Congratulations!** The application has successfully reached a critical milestone:

✅ **Live in Production**  
✅ **Stable End-to-End**  
✅ **Authentication Working**  
✅ **Frontend ↔ Backend Connected**  
✅ **Database Operational**  
✅ **Core Features Functional**

**This marks the official transition from infrastructure building to stability hardening and feature development.**

---

## Implementation Strategy

### Phase 1: Stability & Hardening (Week 1-2)
**Goal:** Ensure production stability before scaling features  
**Focus:** Error handling, monitoring, security

### Phase 2: Feature Buildout (Week 3+)
**Goal:** Add core features (billing, notifications, enhancements)  
**Focus:** User-facing functionality

---

## Phase 1: Stability & Hardening

### Task 1.1: React Error Boundaries ⚠️ **CRITICAL**

**Priority:** 🔴 Highest  
**Effort:** 2-4 hours  
**Impact:** Prevents entire app crashes

**Implementation Steps:**
1. Create `ErrorBoundary.tsx` component
2. Wrap routes in `App.tsx`
3. Add error reporting integration
4. Create fallback UI
5. Test error scenarios

**Files to Create:**
- `frontend/src/components/ErrorBoundary.tsx`

**Files to Modify:**
- `frontend/src/App.tsx`

**Dependencies:** None

---

### Task 1.2: Error Monitoring (Sentry) ⚠️ **CRITICAL**

**Priority:** 🔴 Highest  
**Effort:** 4-8 hours  
**Impact:** Catch errors before users report

**Implementation Steps:**

**Frontend:**
1. Install `@sentry/react`
2. Initialize Sentry in `main.tsx` or `App.tsx`
3. Configure DSN and environment
4. Add error boundary integration
5. Configure release tracking

**Backend:**
1. Install `@sentry/node`
2. Initialize Sentry in `server.ts`
3. Configure DSN and environment
4. Add request context
5. Configure error filtering

**Files to Create:**
- `frontend/src/lib/sentry.ts` (optional config file)
- `src/lib/sentry.ts` (optional config file)

**Files to Modify:**
- `frontend/src/main.tsx` or `frontend/src/App.tsx`
- `src/api/server.ts`
- `frontend/src/components/ErrorBoundary.tsx` (integrate Sentry)

**Dependencies:** 
- Sentry account (free tier available)
- DSN keys for frontend and backend

**Questions:**
- Do you have a Sentry account? (If not, we'll set one up)
- Preferred error sampling rate? (100% for now, or lower?)
- Should we track performance? (optional, adds overhead)

---

### Task 1.3: Production Error Handling ⚠️ **HIGH**

**Priority:** 🟡 High  
**Effort:** 2-3 hours  
**Impact:** Security and debugging

**Implementation Steps:**
1. Update error handlers to conditionally include stack traces
2. Fix empty catch blocks (add logging)
3. Ensure all errors are properly logged
4. Test error responses in production mode

**Files to Modify:**
- `src/api/routes/auth.ts` (lines 54, 100)
- `src/api/routes/*.ts` (all error handlers)
- `src/services/helpers/productMapping.ts`
- `src/fetcher/fetchProductPage.ts`
- `src/fetcher/httpFetch.ts`

**Dependencies:** None

---

### Task 1.4: Structured Logging ⚠️ **MEDIUM**

**Priority:** 🟡 Medium  
**Effort:** 4-6 hours  
**Impact:** Better observability

**Implementation Steps:**

**Backend:**
1. Install `winston` or `pino`
2. Create logger configuration
3. Replace console.log with logger
4. Configure log levels
5. Add request ID tracking

**Frontend:**
1. Remove diagnostic console.logs
2. Keep only essential logs
3. Make remaining logs conditional

**Files to Create:**
- `src/lib/logger.ts`

**Files to Modify:**
- All files with `console.log` (197 instances)
- `frontend/src/lib/apiClient.ts` (remove diagnostic logs)

**Dependencies:** None

**Questions:**
- Preferred logging library? (winston vs pino)
- Log aggregation service? (optional - Datadog, Logtail, etc.)

---

### Task 1.5: Account Lockout ⚠️ **MEDIUM**

**Priority:** 🟡 Medium  
**Effort:** 4-6 hours  
**Impact:** Security hardening

**Implementation Steps:**
1. Create `failed_login_attempts` table or add column to users
2. Track failed attempts per email
3. Lock account after 5 failed attempts
4. Add unlock mechanism (time-based or manual)
5. Update login endpoint to check lock status
6. Add unlock endpoint (admin or time-based)

**Files to Create:**
- `db/migrations/006_add_account_lockout.sql` (if using new table)
- `src/services/accountLockoutService.ts`

**Files to Modify:**
- `src/services/authService.ts`
- `src/api/routes/auth.ts`
- `src/db/repositories/userRepository.ts` (if adding column)

**Dependencies:** Database migration

**Questions:**
- Lockout duration? (15 minutes recommended)
- Unlock method? (automatic after time, or manual admin unlock)

---

### Task 1.6: Password Strength Requirements ⚠️ **LOW-MEDIUM**

**Priority:** 🟢 Low-Medium  
**Effort:** 2-4 hours  
**Impact:** Security improvement

**Implementation Steps:**
1. Update Zod validation schema
2. Add password strength requirements
3. Update frontend validation
4. Add password strength indicator (optional)

**Files to Modify:**
- `src/api/utils/validation.ts`
- `frontend/src/pages/Register.tsx`
- `frontend/src/pages/Login.tsx` (if needed)

**Dependencies:** None

**Questions:**
- Password requirements? (uppercase, number, special char, min 8 chars?)

---

### Task 1.7: Request Size Limits ⚠️ **LOW**

**Priority:** 🟢 Low  
**Effort:** 1-2 hours  
**Impact:** DoS protection

**Implementation Steps:**
1. Add body size limit to Express
2. Add file upload size limits (if applicable)
3. Return proper error responses

**Files to Modify:**
- `src/api/server.ts`

**Dependencies:** None

---

## Phase 2: Feature Buildout

### Task 2.1: Billing & Subscriptions 🟢 **FEATURE**

**Priority:** 🟢 Feature  
**Effort:** 16-24 hours  
**Impact:** Monetization

**Implementation Steps:**

**Payment Integration:**
1. Set up Stripe account
2. Install Stripe SDK
3. Create subscription plans
4. Implement checkout flow
5. Handle webhooks

**Subscription Management:**
1. Track subscription status
2. Handle plan upgrades/downgrades
3. Manage billing cycles
4. Create billing history

**Usage Tracking:**
1. Track API usage per user
2. Track feature usage
3. Enforce usage limits
4. Display usage in dashboard

**Files to Create:**
- `src/services/stripeService.ts`
- `src/api/routes/billing.ts`
- `src/services/usageTrackingService.ts`
- `db/migrations/007_add_billing.sql`
- `frontend/src/pages/Billing.tsx`
- `frontend/src/pages/Checkout.tsx`

**Dependencies:**
- Stripe account
- Stripe API keys
- Database schema updates

**Questions:**
- Payment provider preference? (Stripe recommended)
- Subscription plans? (Free, Pro, Enterprise?)
- Billing cycle? (monthly, annual?)

---

### Task 2.2: Email Notifications 🟢 **FEATURE**

**Priority:** 🟢 Feature  
**Effort:** 12-16 hours  
**Impact:** User engagement

**Implementation Steps:**

**Email Service:**
1. Configure Resend (already in dependencies)
2. Create email templates
3. Implement email sending service
4. Add email queue (optional)

**Email Delivery:**
1. Update email delivery scheduler
2. Process unsent notifications
3. Handle email failures
4. Add retry logic

**Email Templates:**
1. Price drop notification
2. Restock notification
3. Stock change notification
4. Welcome email (optional)

**Files to Modify:**
- `src/services/emailService.ts` (enhance existing)
- `src/jobs/emailDeliveryJob.ts` (enhance existing)
- `src/jobs/emailDeliveryScheduler.ts` (enhance existing)

**Files to Create:**
- `src/templates/email/*.ts` (email templates)

**Dependencies:**
- RESEND_API_KEY (already configured)
- Email templates

**Questions:**
- Email template style? (HTML, plain text, or both?)
- Email branding preferences?

---

### Task 2.3: In-App Notifications 🟢 **FEATURE**

**Priority:** 🟢 Feature  
**Effort:** 8-12 hours  
**Impact:** User engagement

**Implementation Steps:**

**Frontend:**
1. Create notifications component
2. Add real-time updates (WebSocket or polling)
3. Implement notification list
4. Add mark as read functionality
5. Add notification preferences UI

**Backend:**
1. Enhance notification endpoints
2. Add real-time support (optional)
3. Add notification preferences API

**Files to Create:**
- `frontend/src/components/Notifications.tsx` (enhance existing)
- `frontend/src/hooks/useNotifications.ts`

**Files to Modify:**
- `frontend/src/pages/Notifications.tsx` (enhance existing)
- `src/api/routes/notifications.ts` (enhance existing)

**Dependencies:** None (notifications system already exists)

**Questions:**
- Real-time updates? (WebSocket, Server-Sent Events, or polling?)

---

### Task 2.4: Notification Preferences 🟢 **FEATURE**

**Priority:** 🟢 Feature  
**Effort:** 6-8 hours  
**Impact:** User control

**Implementation Steps:**
1. Create settings page
2. Add notification type preferences
3. Add per-item notification settings
4. Update notification service to respect preferences

**Files to Create:**
- `frontend/src/pages/Settings.tsx`
- `frontend/src/pages/Settings/Notifications.tsx`

**Files to Modify:**
- `src/services/notificationService.ts`
- `src/api/routes/userSettings.ts` (enhance existing)

**Dependencies:** None (settings system partially exists)

---

### Task 2.5: Product Tracking Enhancements 🟢 **FEATURE**

**Priority:** 🟢 Feature  
**Effort:** 16-24 hours  
**Impact:** Core functionality

**Implementation Steps:**

**Extraction Improvements:**
1. Add site-specific extraction strategies
2. Improve bot detection handling
3. Add retry logic with exponential backoff
4. Enhance error messages

**Variant Tracking:**
1. Enhance variant matching
2. Add variant-specific notifications
3. Improve variant history

**Tracking Analytics:**
1. Track extraction success rates
2. Track change detection accuracy
3. Add performance metrics dashboard

**Files to Modify:**
- `src/extractor/productExtractor.ts`
- `src/fetcher/fetchProductPage.ts`
- `src/services/productIngestionService.ts`
- `src/jobs/checkWorker.ts`

**Dependencies:** None

**Questions:**
- Priority sites for extraction improvements?
- Analytics dashboard requirements?

---

### Task 2.6: Settings Pages 🟢 **FEATURE**

**Priority:** 🟢 Feature  
**Effort:** 12-16 hours  
**Impact:** User experience

**Implementation Steps:**
1. Create account settings page
2. Create notification settings page
3. Create privacy settings page
4. Add settings navigation
5. Implement settings persistence

**Files to Create:**
- `frontend/src/pages/Settings/Account.tsx`
- `frontend/src/pages/Settings/Privacy.tsx`
- `frontend/src/pages/Settings/Notifications.tsx`

**Files to Modify:**
- `frontend/src/App.tsx` (add routes)
- `src/api/routes/userSettings.ts` (enhance)

**Dependencies:** None

---

### Task 2.7: UX Improvements 🟢 **FEATURE**

**Priority:** 🟢 Feature  
**Effort:** 16-24 hours  
**Impact:** User experience

**Implementation Steps:**
1. Improve error messages (user-friendly)
2. Add consistent loading states
3. Enhance empty states
4. Add success feedback (toasts)
5. Improve form validation
6. Add loading skeletons

**Files to Modify:**
- All frontend pages
- `frontend/src/components/ui/*` (enhance existing)

**Dependencies:** None

**Questions:**
- UI component library preferences? (already using Radix UI)
- Toast notification library? (already have Toaster component)

---

## Questions for You

Before proceeding with implementation, I need to confirm:

### Phase 1 Questions:

1. **Error Monitoring:**
   - Do you have a Sentry account? (If not, we'll create one)
   - Error sampling rate preference? (100% recommended for now)
   - Track performance metrics? (optional, adds overhead)

2. **Logging:**
   - Preferred logging library? (winston vs pino - pino is faster)
   - Log aggregation service? (optional - can add later)

3. **Account Lockout:**
   - Lockout duration? (15 minutes recommended)
   - Unlock method? (automatic after time, or manual admin unlock)

4. **Password Strength:**
   - Requirements? (e.g., uppercase, number, special char, min 8 chars)

### Phase 2 Questions:

5. **Billing:**
   - Payment provider? (Stripe recommended)
   - Subscription plans? (Free, Pro, Enterprise?)
   - Billing cycle? (monthly, annual, both?)

6. **Email:**
   - Email template style? (HTML, plain text, or both?)
   - Email branding preferences?

7. **Notifications:**
   - Real-time updates? (WebSocket, Server-Sent Events, or polling?)

8. **Product Tracking:**
   - Priority sites for extraction improvements?
   - Analytics dashboard requirements?

### Execution Order:

**Recommended Order:**
1. Phase 1, Task 1.1: Error Boundaries (4h) - **START HERE**
2. Phase 1, Task 1.2: Error Monitoring (8h) - **NEXT**
3. Phase 1, Task 1.3: Production Errors (3h)
4. Phase 1, Task 1.4: Structured Logging (6h)
5. Phase 1, Task 1.5: Account Lockout (6h)
6. Phase 1, Task 1.6: Password Strength (4h)
7. Phase 1, Task 1.7: Request Limits (2h)

**Then proceed to Phase 2 features in priority order.**

---

## Confirmation Needed

Please confirm:

1. ✅ **Execution order** - Start with Error Boundaries, then Error Monitoring?
2. ✅ **Sentry setup** - Create new account or use existing?
3. ✅ **Logging library** - winston or pino? (recommend pino)
4. ✅ **Account lockout** - 15 minutes automatic unlock?
5. ✅ **Password strength** - Requirements preference?
6. ✅ **Phase 2 priorities** - Which features are highest priority?

Once confirmed, I'll begin implementation starting with Error Boundaries.

---

**Status:** ⏸️ **AWAITING CONFIRMATION**  
**Ready to Begin:** ✅ Yes, after confirmation



