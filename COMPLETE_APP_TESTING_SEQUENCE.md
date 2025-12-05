# Complete App Testing Sequence
**App:** `https://app.restocked.now`  
**Date:** December 4, 2025

---

## 🎯 Purpose

Step-by-step instructions for testing the entire app after login starts working.

---

## ✅ Prerequisites

- [ ] `VITE_API_BASE_URL` added to Vercel
- [ ] Vercel deployment completed
- [ ] Browser cache cleared
- [ ] DevTools ready (F12)

---

## 🧪 Complete Testing Sequence

### Test 1: Create a User Account

#### Step 1.1: Navigate to Registration

1. **Go to:** `https://app.restocked.now/register`
2. **Expected:** Registration page loads
3. **Check:** No console errors

**Status:** [ ] ✅ Page Loads [ ] ❌ Error

---

#### Step 1.2: Fill Registration Form

1. **Enter Email:**
   - Use unique email: `test-$(date +%s)@example.com`
   - Or: `test@example.com`

2. **Enter Password:**
   - Minimum: 6 characters
   - Example: `TestPassword123!`

3. **Click:** "Sign up" button

**Status:** [ ] ✅ Form Submitted [ ] ❌ Error

---

#### Step 1.3: Verify Registration Success

**Expected:**
- ✅ No error message
- ✅ Redirects to `/dashboard`
- ✅ Dashboard loads

**Network Tab:**
- ✅ `POST /auth/register` returns 201 Created
- ✅ Response contains `user` and `token`

**localStorage:**
- ✅ `auth-storage` key exists
- ✅ Contains user and token

**Status:** [ ] ✅ Registration Success [ ] ❌ Failed

---

### Test 2: Log In

#### Step 2.1: Navigate to Login

1. **Go to:** `https://app.restocked.now/login`
2. **Expected:** Login page loads
3. **Check:** No console errors

**Status:** [ ] ✅ Page Loads [ ] ❌ Error

---

#### Step 2.2: Fill Login Form

1. **Enter Email:** Use registered email
2. **Enter Password:** Use registered password
3. **Click:** "Sign in" button

**Status:** [ ] ✅ Form Submitted [ ] ❌ Error

---

#### Step 2.3: Verify Login Success

**Expected:**
- ✅ No error message
- ✅ Redirects to `/dashboard`
- ✅ Dashboard loads

**Network Tab:**
- ✅ `POST /auth/login` returns 200 OK
- ✅ Response contains `user` and `token`

**localStorage:**
- ✅ Token updated in `auth-storage`
- ✅ User data updated

**Status:** [ ] ✅ Login Success [ ] ❌ Failed

---

### Test 3: Load the Dashboard

#### Step 3.1: Verify Dashboard Loads

**Expected:**
- ✅ Dashboard page displays
- ✅ Shows "Dashboard" heading
- ✅ Shows "Add a Product" form
- ✅ Shows tracked items (or empty state)

**Network Tab:**
- ✅ `GET /me/tracked-items` returns 200 OK
- ✅ `GET /me/notifications?limit=1&offset=0` returns 200 OK

**Status:** [ ] ✅ Dashboard Loads [ ] ❌ Error

---

#### Step 3.2: Verify Empty State

**If No Tracked Items:**
- ✅ Shows "No tracked items yet" message
- ✅ Shows "Add a Product" form
- ✅ Form has URL input and button

**Status:** [ ] ✅ Empty State Correct [ ] ❌ Error

---

### Test 4: Add a Product

#### Step 4.1: Add Product via Dashboard

1. **Enter Product URL:** `https://example.com/product`
   - Use a real product URL for testing
   - Example: Amazon, eBay, or any e-commerce site

2. **Click:** "Add Product" button

**Expected:**
- ✅ Loading state shows
- ✅ Product is fetched and created
- ✅ Product added to tracked items
- ✅ Appears in dashboard list

**Network Tab:**
- ✅ `POST /products` returns 201 Created
- ✅ `POST /me/tracked-items` returns 201 Created
- ✅ `GET /me/tracked-items` returns 200 OK (refresh)

**Status:** [ ] ✅ Product Added [ ] ❌ Failed

---

#### Step 4.2: Verify Product in Dashboard

**Expected:**
- ✅ Product appears in dashboard
- ✅ Shows product image
- ✅ Shows product name
- ✅ Shows product URL
- ✅ Shows "View Details" button
- ✅ Shows delete button

**Status:** [ ] ✅ Product Visible [ ] ❌ Not Visible

---

### Test 5: Trigger a Price Check

#### Step 5.1: Verify Scheduler is Running

**Railway Logs:**
```bash
railway logs | grep -i scheduler
```

**Expected:**
- ✅ Check scheduler running
- ✅ Email scheduler running
- ✅ No scheduler errors

**Status:** [ ] ✅ Scheduler Running [ ] ❌ Not Running

---

#### Step 5.2: Manually Trigger Check (Optional)

**If Scheduler Not Running:**

**Railway CLI:**
```bash
railway run npm run check:all
```

**Or via Admin Endpoint (if available):**
```bash
curl -X POST https://restockednew-production.up.railway.app/admin/checks/trigger \
  -H "Authorization: Bearer <admin-token>"
```

**Expected:**
- ✅ Check runs for tracked items
- ✅ Price/stock data updated
- ✅ Notifications created (if changes detected)

**Status:** [ ] ✅ Check Triggered [ ] ❌ Failed

---

#### Step 5.3: Verify Check Results

**Wait 1-2 minutes after check runs**

**Dashboard:**
- ✅ Product shows updated price
- ✅ Product shows updated stock status
- ✅ "Last updated" timestamp updated

**Network Tab:**
- ✅ `GET /me/tracked-items` shows updated data

**Status:** [ ] ✅ Data Updated [ ] ❌ Not Updated

---

### Test 6: View Product History

#### Step 6.1: Navigate to Product Details

1. **Click:** "View Details" on a tracked item
2. **Expected:** Product details page loads
3. **URL:** `/product/:id`

**Network Tab:**
- ✅ `GET /products/:id` returns 200 OK
- ✅ Response contains product and variants

**Status:** [ ] ✅ Product Details Load [ ] ❌ Error

---

#### Step 6.2: Navigate to Variant History

1. **Click:** "View History" on a variant
2. **Expected:** Product history page loads
3. **URL:** `/product/:id/history/:variantId`

**Network Tab:**
- ✅ `GET /variants/:variantId` returns 200 OK
- ✅ Response contains variant, priceHistory, stockHistory

**Status:** [ ] ✅ History Loads [ ] ❌ Error

---

#### Step 6.3: Verify History Charts

**Expected:**
- ✅ Price History tab shows chart
- ✅ Stock History tab shows chart
- ✅ Raw Data tab shows tables
- ✅ Charts display data (if history exists)

**If No History:**
- ✅ Shows "No price history available"
- ✅ Shows "No stock history available"

**Status:** [ ] ✅ Charts Display [ ] ❌ Error

---

### Test 7: Test Notifications

#### Step 7.1: Navigate to Notifications

1. **Click:** Notifications icon in navbar (bell icon)
2. **Expected:** Notifications page loads
3. **URL:** `/notifications`

**Network Tab:**
- ✅ `GET /me/notifications?limit=50&offset=0` returns 200 OK
- ✅ Response contains notifications array

**Status:** [ ] ✅ Notifications Load [ ] ❌ Error

---

#### Step 7.2: Verify Notifications Display

**If No Notifications:**
- ✅ Shows "No notifications yet" message
- ✅ Shows helpful text about notifications

**If Has Notifications:**
- ✅ Shows list of notifications
- ✅ Shows notification type (PRICE, STOCK, RESTOCK)
- ✅ Shows notification message
- ✅ Shows product name and image
- ✅ Shows timestamp

**Status:** [ ] ✅ Notifications Display [ ] ❌ Error

---

#### Step 7.3: Mark Notification as Read

1. **Click:** "Mark as read" on a notification
2. **Expected:** Notification marked as read
3. **Or:** Click "Mark all as read" button

**Network Tab:**
- ✅ `POST /me/notifications/mark-read` returns 200 OK
- ✅ Response contains `markedCount`

**Expected:**
- ✅ Notification shows as read
- ✅ Unread count decreases
- ✅ Badge updates in navbar

**Status:** [ ] ✅ Mark Read Works [ ] ❌ Failed

---

### Test 8: Test Settings Pages

#### Step 8.1: Navigate to Notification Settings

1. **Click:** Settings link (in notifications page or navbar)
2. **Expected:** Notification settings page loads
3. **URL:** `/settings/notifications`

**Network Tab:**
- ✅ `GET /me/settings/notifications` returns 200 OK
- ✅ Response contains settings object

**Status:** [ ] ✅ Settings Load [ ] ❌ Error

---

#### Step 8.2: Verify Settings Display

**Expected:**
- ✅ Shows email notifications toggle
- ✅ Shows push notifications toggle (disabled)
- ✅ Shows price change threshold input
- ✅ Shows notification types (disabled toggles)

**Status:** [ ] ✅ Settings Display [ ] ❌ Error

---

#### Step 8.3: Update Settings

1. **Toggle:** Email notifications on/off
2. **Change:** Price change threshold (0-100)
3. **Click:** "Save Settings" button

**Network Tab:**
- ✅ `POST /me/settings/notifications` returns 200 OK
- ✅ Response contains updated settings

**Expected:**
- ✅ Success toast message
- ✅ Settings persist after refresh

**Status:** [ ] ✅ Settings Save [ ] ❌ Failed

---

#### Step 8.4: Verify Settings Persist

1. **Refresh page:** F5 or Cmd+R
2. **Expected:** Settings still show updated values
3. **Check:** Settings match what you saved

**Status:** [ ] ✅ Settings Persist [ ] ❌ Lost on Refresh

---

### Test 9: Test Upgrade/Downgrade

#### Step 9.1: Navigate to Upgrade Page

1. **Click:** "Upgrade" link (in navbar or banner)
2. **Expected:** Upgrade page loads
3. **URL:** `/upgrade`

**Network Tab:**
- ✅ `GET /me/plan` returns 200 OK
- ✅ Response contains plan and limits

**Status:** [ ] ✅ Upgrade Page Loads [ ] ❌ Error

---

#### Step 9.2: Verify Plan Display

**Expected:**
- ✅ Shows current plan (Free or Pro)
- ✅ Shows plan limits
- ✅ Shows upgrade/downgrade buttons

**Status:** [ ] ✅ Plan Display [ ] ❌ Error

---

#### Step 9.3: Test Upgrade (If Free)

1. **Click:** "Upgrade to Pro" button
2. **Expected:** Plan upgraded to Pro

**Network Tab:**
- ✅ `POST /me/upgrade` returns 200 OK
- ✅ Response contains updated user

**Expected:**
- ✅ Success message
- ✅ Plan shows as "Pro"
- ✅ Limits updated

**Status:** [ ] ✅ Upgrade Works [ ] ❌ Failed

---

#### Step 9.4: Test Downgrade (If Pro)

1. **Click:** "Downgrade to Free" button
2. **Expected:** Plan downgraded to Free (if within limits)

**Network Tab:**
- ✅ `POST /me/downgrade` returns 200 OK
- ✅ Response contains updated user

**Expected:**
- ✅ Success message
- ✅ Plan shows as "Free"
- ✅ Limits updated

**Status:** [ ] ✅ Downgrade Works [ ] ❌ Failed

---

## ✅ Complete Testing Checklist

### Authentication
- [ ] Registration works
- [ ] Login works
- [ ] Token stored in localStorage
- [ ] Token persists after refresh

### Dashboard
- [ ] Dashboard loads after login
- [ ] Empty state displays correctly
- [ ] Tracked items display correctly
- [ ] Can add products
- [ ] Can delete tracked items

### Product Management
- [ ] Can add product by URL
- [ ] Product details page loads
- [ ] Variants display correctly
- [ ] Can track product
- [ ] Can track variant

### Product History
- [ ] History page loads
- [ ] Price history chart displays
- [ ] Stock history chart displays
- [ ] Raw data tables display

### Notifications
- [ ] Notifications page loads
- [ ] Notifications display correctly
- [ ] Can mark as read
- [ ] Can mark all as read
- [ ] Unread count updates

### Settings
- [ ] Settings page loads
- [ ] Settings display correctly
- [ ] Can update settings
- [ ] Settings persist after refresh

### Upgrade/Downgrade
- [ ] Upgrade page loads
- [ ] Plan information displays
- [ ] Can upgrade to Pro
- [ ] Can downgrade to Free

### General
- [ ] No console errors
- [ ] No network errors
- [ ] All API calls succeed
- [ ] All pages load correctly
- [ ] Navigation works

---

**Testing Complete:** [ ] ✅ All Pass [ ] ⚠️ Some Issues [ ] ❌ Failed

**Issues Found:**
```
[List any issues here]
```

---

**Document Generated:** December 4, 2025  
**Next Step:** Check for remaining production blockers



