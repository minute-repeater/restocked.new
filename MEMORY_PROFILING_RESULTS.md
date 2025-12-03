# Memory Profiling Results

**Date:** December 3, 2025  
**Profiling Script:** `scripts/profileExtractor.ts`

---

## Test Results

### URL 1: cherryla.com
- **Memory Growth:** +2.84 MB
- **Heap Used Before:** 22.53 MB
- **Heap Used After:** 25.37 MB
- **Heap Snapshot Before:** 22.77 MB
- **Heap Snapshot After:** 23.52 MB
- **Variants Found:** 2
- **Status:** ✅ Success

### URL 2: alldaygoods.co.uk
- **Memory Growth:** +3.02 MB
- **Heap Used Before:** 22.53 MB
- **Heap Used After:** 25.55 MB
- **Heap Snapshot Before:** 22.79 MB
- **Heap Snapshot After:** 23.54 MB
- **Variants Found:** 5
- **Status:** ✅ Success

---

## Key Findings

### ✅ Extraction Memory Usage is LOW
- Single extraction uses only **~3MB** of heap memory
- This is well within acceptable limits
- No memory leaks detected in isolated extraction

### ⚠️ OOM Crashes Likely Caused By:

1. **Concurrent Extractions**
   - Server may process multiple requests simultaneously
   - Memory accumulates: 3MB × N requests = OOM
   - Need to add request queue/rate limiting

2. **Variant Combination Explosion**
   - `cartesianProduct()` creates all combinations
   - Example: 5 sizes × 5 colors = 25 variants
   - Example: 10 sizes × 10 colors × 10 styles = 1,000 variants
   - Each variant creates multiple objects
   - **This is the likely culprit for OOM**

3. **Cheerio DOM Retention**
   - Cheerio keeps entire HTML in memory
   - Multiple extractions = multiple DOM copies
   - Need to clear Cheerio instances after use

4. **Server Overhead**
   - Express, database connections, schedulers
   - Base memory: ~300-400MB RSS
   - Extraction adds ~3MB per request
   - Multiple concurrent requests = OOM

---

## Heap Snapshot Analysis

### Snapshot Locations:
- `/tmp/heap-before-*.heapsnapshot` (~23MB each)
- `/tmp/heap-after-*.heapsnapshot` (~24MB each)

### To Analyze:
1. Open Chrome DevTools
2. Go to Memory tab
3. Load snapshot files from `/tmp`
4. Compare snapshots to find:
   - Largest retained objects
   - Objects that grew between snapshots
   - Memory leaks (objects not garbage collected)

---

## Recommendations

### 1. Limit Variant Combinations ⚠️ **CRITICAL**
```typescript
// In buildVariantCombinations functions:
const MAX_VARIANTS = 100; // Limit to 100 variants max
if (variants.length > MAX_VARIANTS) {
  // Take first 100 or sample
  variants = variants.slice(0, MAX_VARIANTS);
  notes.push(`Limited variants to ${MAX_VARIANTS} (found ${originalCount})`);
}
```

### 2. Add Request Queue
- Limit concurrent extractions to 1-2
- Queue other requests
- Prevents memory accumulation

### 3. Clear Cheerio After Use
```typescript
// After extraction, clear references
$ = null;
htmlToParse = null;
jsonBlobs = null;
```

### 4. Add Variant Count Limits
- Limit attributes per variant
- Limit total variants per product
- Early exit if combinations explode

### 5. Monitor Memory Per Request
- Log memory before/after each extraction
- Alert if memory > threshold
- Reject requests if memory too high

---

## Next Steps

1. ✅ Profiling script created and working
2. ⏭️ Add variant combination limits
3. ⏭️ Add request queue for extractions
4. ⏭️ Clear Cheerio references after use
5. ⏭️ Test with concurrent requests
6. ⏭️ Analyze heap snapshots in Chrome DevTools

---

**Conclusion:** Single extraction is memory-efficient (~3MB), but variant combination explosion and concurrent requests likely cause OOM crashes.

