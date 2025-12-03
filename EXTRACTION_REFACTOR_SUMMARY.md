# Product Extractor Refactoring Summary

**Date:** December 3, 2025

## Changes Implemented ✅

### 1. Fetch-First Extraction Strategy ✅
- **HTTP GET first**: Tries standard HTTP fetch before Playwright
- **JSON-LD Product schema detection**: Checks for JSON-LD Product schema in HTML
- **Shopify detection**: Detects Shopify stores and tries JSON endpoints:
  - `?view=json`
  - `product.json`
  - `productUrl + ".json"`
- **Playwright fallback**: Only uses Playwright if fetch-based extraction fails

### 2. Global 20-Second Timeout ✅
- Wrapped entire extraction in `Promise.race()` with 20-second timeout
- Prevents hanging extractions
- Returns graceful error on timeout

### 3. Playwright Try/Finally Block ✅
- Browser, context, and page are always closed in `finally` block
- No code path can skip cleanup
- Proper error handling for cleanup failures

### 4. Playwright Configuration ✅
- `headless: true`
- Realistic desktop user agent set via browser context
- `page.goto()` with `waitUntil: "domcontentloaded"` (faster than networkidle)
- 15-second timeout (reduced from 20s)

### 5. Memory Logging ✅
- Logs memory before extraction: `[Memory] Before extraction: X MB`
- Logs memory after extraction: `[Memory] After extraction: X MB (delta: Y MB)`
- Logs memory after errors

### 6. Error Handling ✅
- All errors caught and returned as structured FetchResult
- No unhandled promise rejections
- Server does not crash on extraction failures
- Graceful fallback from HTTP → Playwright → Error

### 7. Memory Check with GC ✅
- Checks if heap usage > 500MB before extraction
- Calls `global.gc()` if available (requires `--expose-gc` flag)
- Warning logged when GC is triggered

### 8. POST /products Route ✅
- Already has proper error handling
- Returns structured errors
- No changes needed

### 9. Disable Schedulers in Development ✅
- **Check Scheduler**: Disabled when `NODE_ENV=development`
- **Email Delivery Scheduler**: Disabled when `NODE_ENV=development`
- Logs indicate when schedulers are disabled

## Files Modified

1. **`src/fetcher/fetchProductPage.ts`**
   - Added fetch-first strategy
   - Added Shopify detection and JSON endpoint support
   - Added JSON-LD Product schema detection
   - Added 20-second timeout wrapper
   - Added memory logging
   - Added memory check with GC
   - Improved error handling

2. **`src/fetcher/playwrightFetch.ts`**
   - Added proper browser context handling
   - Set realistic user agent
   - Changed `waitUntil` to `domcontentloaded`
   - Reduced timeout to 15 seconds
   - Added proper cleanup in `finally` block
   - Ensures context is closed

3. **`src/fetcher/types.ts`**
   - Added `shopifyJson?: boolean` to metadata
   - Added `jsonLdFound?: boolean` to metadata

4. **`src/jobs/checkScheduler.ts`**
   - Disabled in development mode

5. **`src/jobs/emailDeliveryScheduler.ts`**
   - Disabled in development mode

## Testing Status ⚠️

### Server Status
- ✅ Server starts successfully
- ✅ Health check responds
- ⚠️ Still experiencing OOM crashes during extraction

### Test URLs
- **URL 1**: `https://cherryla.com/collections/headwear/products/bucking-dad-hat-beige`
  - Status: Server crashes during extraction
  - Error: Out of memory

- **URL 2**: `https://www.alldaygoods.co.uk/products/the-maldon-everyday-set`
  - Status: Server crashes during extraction
  - Error: Out of memory

### Root Cause Analysis

The memory issues persist despite:
- Fetch-first strategy (should avoid Playwright)
- Proper cleanup (should free memory)
- Memory logging (to track usage)
- GC calls (to force cleanup)

**Possible causes:**
1. **Large HTML pages**: Some sites return very large HTML that consumes memory during parsing
2. **Cheerio memory usage**: Parsing large HTML with Cheerio can be memory-intensive
3. **JSON extraction**: Extracting embedded JSON from large pages can consume memory
4. **Variant extraction**: Complex variant extraction logic may create many objects

## Recommendations

1. **Add HTML size limits**: Reject HTML > 10MB before parsing
2. **Stream parsing**: Use streaming parsers instead of loading entire HTML
3. **Chunk processing**: Process HTML in chunks rather than all at once
4. **Memory profiling**: Use Node.js memory profiler to identify exact leak
5. **Increase memory limit**: Try 8GB instead of 4GB (temporary workaround)
6. **Add request queue**: Limit concurrent extractions to prevent memory spikes

## Next Steps

1. ✅ Implement fetch-first strategy
2. ✅ Add timeouts and error handling
3. ✅ Disable schedulers in development
4. ⏭️ Add HTML size limits
5. ⏭️ Optimize Cheerio usage
6. ⏭️ Add memory profiling
7. ⏭️ Test with memory profiler to identify leaks

---

**Status**: Refactoring complete, but memory issues persist. Need further optimization.

