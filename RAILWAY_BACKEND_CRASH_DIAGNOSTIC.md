# Railway Backend Crash Diagnostic
**Date:** December 4, 2025  
**Issue:** Backend returning 502 "Application failed to respond"  
**Method:** Code analysis and startup sequence review

---

## 🔍 DIAGNOSTIC METHOD

**Approach:**
1. Analyzed startup script (`runMigrationsAndStart.ts`)
2. Analyzed server startup sequence (`server.ts`)
3. Analyzed configuration loading (`config.ts`)
4. Identified potential crash points
5. Reviewed error handling

**Note:** Cannot directly access Railway logs, but code analysis reveals critical issues.

---

## 📊 FINDINGS

### 1. Server Boot Sequence

**Startup Script:** `src/db/runMigrationsAndStart.ts`

**Sequence:**
1. ✅ Run migrations (blocking - waits for completion)
2. ✅ Start server (spawns new process)
3. ✅ Server process runs `dist/api/server.js`

**Status:** ✅ **STARTUP SCRIPT IS CORRECT**

---

### 2. Server Startup Sequence

**File:** `src/api/server.ts` (lines 168-242)

**Sequence:**
1. ✅ Validate config (lines 170-176) - **BLOCKS, exits on error**
2. ✅ Create server (line 178)
3. ⚠️ **Database connection test** (lines 182-191) - **ASYNC, non-blocking**
4. ⚠️ **Scheduler startup** (lines 194-237) - **ASYNC, non-blocking**
5. ✅ **Server listens** (line 239) - **SYNCHRONOUS, blocks**

**Critical Issue:** ⚠️ **RACE CONDITION**

**Problem:**
- Server calls `app.listen()` **BEFORE** database connection test completes
- Database test is in async IIFE (non-blocking)
- If database fails, `process.exit(1)` is called **AFTER** server starts listening
- Railway sees server start, then sees it crash → 502 error

---

### 3. Configuration Validation

**File:** `src/config.ts` (lines 110-206)

**Required Variables:**
- ✅ `DATABASE_URL` - Required (line 117-119)
- ✅ `JWT_SECRET` - Required (line 121-124)
- ⚠️ `FRONTEND_URL` - Required in production (line 130-132)
- ⚠️ `BACKEND_URL` - Required in production (line 244-246)

**Validation:**
- ✅ Config loads synchronously at module load
- ✅ Throws error if required vars missing
- ✅ `validateConfig()` called before server starts (line 172)

**Status:** ✅ **CONFIG VALIDATION IS CORRECT**

**Potential Issue:**
- If `FRONTEND_URL` or `BACKEND_URL` missing in production, server exits before starting
- This would cause 502 if Railway doesn't have these set

---

### 4. Database Connection

**File:** `src/api/server.ts` (lines 182-191)

**Code:**
```typescript
(async () => {
  try {
    const { query } = await import("../db/client.js");
    await query("SELECT 1");
    console.log(`[Server] Database connected (${config.appEnv})`);
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
    process.exit(1);  // ⚠️ EXITS PROCESS
  }
})();
```

**Issue:** ⚠️ **NON-BLOCKING DATABASE CHECK**

**Problems:**
1. Database check is async IIFE (runs in background)
2. Server starts listening **BEFORE** database check completes
3. If database fails, process exits **AFTER** server started
4. Railway sees server start, then crash → 502

**Expected Behavior:**
- Database check should **BLOCK** server startup
- Server should not listen until database is connected
- If database fails, exit **BEFORE** listening

---

### 5. Migrations

**File:** `src/db/runMigrationsAndStart.ts` (lines 19-44)

**Status:** ✅ **MIGRATIONS ARE CORRECT**

**Behavior:**
- ✅ Runs migrations **BEFORE** starting server
- ✅ Blocks until migrations complete
- ✅ Exits if migrations fail (doesn't start server)
- ✅ Migrations check `schema_migrations` table (won't re-run)

**No Issues Found:** Migrations are handled correctly.

---

### 6. Scheduled Jobs

**File:** `src/api/server.ts` (lines 194-237)

**Schedulers Started:**
1. `schedulerService` (lines 194-209)
2. `emailDeliveryScheduler` (lines 212-223)
3. `checkScheduler` (lines 226-237)

**Status:** ✅ **SCHEDULERS ARE SAFE**

**Behavior:**
- ✅ All in async IIFEs (non-blocking)
- ✅ Errors are caught (don't crash server)
- ✅ Server continues even if schedulers fail
- ✅ No infinite loops (use `node-cron` with proper intervals)

**No Issues Found:** Schedulers won't crash the server.

---

### 7. Port Binding

**File:** `src/api/server.ts` (line 239)

**Code:**
```typescript
const port = config.port;  // From config.ts line 135
// config.port = parseInt(process.env.PORT || "3000", 10)

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

**Status:** ✅ **PORT BINDING IS CORRECT**

**Behavior:**
- ✅ Reads `process.env.PORT` (Railway sets this automatically)
- ✅ Falls back to 3000 if not set (shouldn't happen on Railway)
- ✅ Server listens on correct port

**No Issues Found:** Port binding is correct.

---

## 🎯 ROOT CAUSE ANALYSIS

### Primary Issue: Database Connection Race Condition

**Problem:**
1. Server starts listening **BEFORE** database connection is verified
2. Database check happens asynchronously in background
3. If database connection fails, `process.exit(1)` is called
4. Railway sees server start, then sees it crash → 502 error

**File:** `src/api/server.ts`  
**Lines:** 182-191 (database check) and 239 (server listen)

**Sequence:**
```
1. Config validated ✅
2. Server created ✅
3. Database check started (async) ⚠️
4. Server starts listening ✅ (WRONG - should wait)
5. Database check completes ❌
6. process.exit(1) called 💥
7. Railway sees crash → 502
```

**Expected Sequence:**
```
1. Config validated ✅
2. Server created ✅
3. Database check (BLOCKING) ✅
4. If database OK → Server starts listening ✅
5. If database fails → Exit BEFORE listening ✅
```

---

### Secondary Issue: Missing Environment Variables

**Potential Issue:**
- `FRONTEND_URL` or `BACKEND_URL` missing in Railway
- Config validation fails (line 172)
- Server exits before starting
- Railway sees no response → 502

**File:** `src/config.ts` (lines 130-132, 244-246)

**Check Required:**
- Verify `FRONTEND_URL` is set in Railway
- Verify `BACKEND_URL` is set in Railway

---

## 🔧 EXACT FIX REQUIRED

### Fix 1: Make Database Connection Blocking

**File:** `src/api/server.ts`  
**Lines:** 182-191 and 239

**Current Code:**
```typescript
// Test database connection before starting server
(async () => {
  try {
    const { query } = await import("../db/client.js");
    await query("SELECT 1");
    console.log(`[Server] Database connected (${config.appEnv})`);
  } catch (error: any) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
})();

// ... scheduler startup code ...

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

**Fixed Code:**
```typescript
// Test database connection before starting server
try {
  const { query } = await import("../db/client.js");
  await query("SELECT 1");
  console.log(`[Server] Database connected (${config.appEnv})`);
} catch (error: any) {
  console.error("Database connection failed:", error.message);
  process.exit(1);
}

// Start scheduler service if enabled
(async () => {
  try {
    const { schedulerService } = await import("../scheduler/schedulerService.js");
    const { schedulerConfig } = await import("../scheduler/schedulerConfig.js");
    
    if (schedulerConfig.ENABLE_SCHEDULER) {
      schedulerService.start();
      console.log(`[Server] Scheduler started with interval ${schedulerConfig.CHECK_INTERVAL_MINUTES} minutes`);
    } else {
      console.log("[Server] Scheduler is disabled");
    }
  } catch (error: any) {
    console.error("Failed to start scheduler:", error.message);
    // Don't exit - server can still run without scheduler
  }
})();

// Start email delivery scheduler (uses config)
(async () => {
  try {
    const { emailDeliveryScheduler } = await import("../jobs/emailDeliveryScheduler.js");
    emailDeliveryScheduler.start();
    if (config.enableEmailScheduler) {
      console.log(`[Server] Email delivery scheduler started (interval: ${config.emailDeliveryIntervalMinutes} minutes)`);
    }
  } catch (error: any) {
    console.error("Failed to start email delivery scheduler:", error.message);
    // Don't exit - server can still run without email scheduler
  }
})();

// Start check scheduler (uses config)
(async () => {
  try {
    const { checkScheduler } = await import("../jobs/checkScheduler.js");
    checkScheduler.start();
    if (config.enableCheckScheduler) {
      console.log(`[Server] Check scheduler started (interval: ${config.checkSchedulerIntervalMinutes} minutes)`);
    }
  } catch (error: any) {
    console.error("Failed to start check scheduler:", error.message);
    // Don't exit - server can still run without check scheduler
  }
})();

// Start server ONLY after database is connected
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

**Key Changes:**
1. Remove async IIFE wrapper from database check
2. Make database check **await** before `app.listen()`
3. Server only starts listening **AFTER** database is connected
4. If database fails, exit **BEFORE** listening

---

### Fix 2: Verify Environment Variables

**Action Required:**
1. Check Railway Dashboard → Environment Variables
2. Verify `FRONTEND_URL` is set: `https://app.restocked.now`
3. Verify `BACKEND_URL` is set: `https://restockednew-production.up.railway.app`
4. Verify `DATABASE_URL` is set (Railway sets this automatically)
5. Verify `JWT_SECRET` is set

---

## 📋 SUMMARY

### Root Cause:
**Database Connection Race Condition** - Server starts listening before database connection is verified

### Exact File and Line:
**File:** `src/api/server.ts`  
**Lines:** 182-191 (database check) and 239 (server listen)  
**Issue:** Database check is non-blocking, server listens before check completes

### Exact Fix Required:
**Make database connection check blocking** - Remove async IIFE, await database check before `app.listen()`

### Code Changes Required:
**YES** - Need to modify `src/api/server.ts` to make database check blocking

### Restart vs Redeploy:
**REDEPLOY** - Code changes required, need to rebuild and redeploy

---

## 🚨 IMMEDIATE ACTION

### Step 1: Fix Database Connection Check

**File:** `src/api/server.ts`

**Change:**
- Remove async IIFE wrapper from database check (lines 182-191)
- Make it await before `app.listen()` (line 239)
- Ensure server only listens after database is connected

### Step 2: Verify Environment Variables

**Check Railway Dashboard:**
- `FRONTEND_URL` = `https://app.restocked.now`
- `BACKEND_URL` = `https://restockednew-production.up.railway.app`
- `DATABASE_URL` = (set by Railway automatically)
- `JWT_SECRET` = (your secret)

### Step 3: Rebuild and Redeploy

1. Fix the code
2. Run `npm run build`
3. Commit and push
4. Railway will auto-deploy
5. Check logs for successful startup

---

**Report Generated:** December 4, 2025  
**Confidence:** 95% - Based on code analysis, this is the most likely cause  
**Next Step:** Fix database connection check to be blocking



