# Phase 1 Changes - Quick Reference

## 🔄 API Changes

### Error Response Format (BREAKING CHANGE)
**Old Format:**
```json
{
  "error": "Error message",
  "message": "Details"
}
```

**New Format:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional */ }
  }
}
```

### Error Codes
- `INVALID_URL` - URL validation failed
- `INVALID_REQUEST` - Request validation failed
- `NOT_FOUND` - Resource not found
- `FETCH_FAILED` - Page fetch failed
- `INTERNAL_ERROR` - Server error
- `RATE_LIMIT_EXCEEDED` - Too many requests

### Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: All POST endpoints
- **Response**: 429 status with structured error

## 🗄️ Database Changes

### Variant Matching Behavior
**Before**: Exact match only (attributes must be identical)

**After**: Multi-strategy matching:
1. Exact match (attributes identical)
2. Subset match (existing attributes ⊆ new attributes)
3. SKU match (if SKU provided)

**Impact**: Prevents duplicate variants when sites add new attributes

### History Insertion Behavior
**Before**: Every check inserted price/stock history

**After**: Only inserts when value changes:
- Price: Compares price AND currency
- Stock: Compares status

**Impact**: Reduces database bloat, enables change detection

## 🔒 Security Improvements

### URL Validation
- Only HTTP/HTTPS URLs accepted
- Rejects dangerous schemes (file://, javascript:, data:, etc.)
- Validates URL format and hostname

### Rate Limiting
- Prevents abuse and DDoS
- Configurable limits
- Returns structured errors

## 📊 Observability

### Request Logging
- Logs all requests: `[TIMESTAMP] METHOD /path`
- Logs responses: `✅/❌ [TIMESTAMP] METHOD /path - STATUS (DURATIONms)`

### Database Query Logging (Dev Mode Only)
- Logs all queries with timing: `[DB] 12ms SELECT * FROM ...`
- Logs errors: `[DB] ERROR query...`

## 📝 Migration Notes

### For API Consumers
1. Update error handling to use new structured format
2. Handle `RATE_LIMIT_EXCEEDED` error code
3. Respect rate limits (100 req/15min)

### For Developers
1. Use `validateURL()` utility for URL validation
2. Use error utilities from `src/api/utils/errors.ts`
3. Request logging is automatic (no code changes needed)
4. DB logging is automatic in dev mode

## 🧪 Testing Checklist

- [ ] Test variant exact matching
- [ ] Test variant subset matching
- [ ] Test variant SKU matching
- [ ] Test price change detection
- [ ] Test stock change detection
- [ ] Test URL validation (valid/invalid)
- [ ] Test rate limiting
- [ ] Test error response format
- [ ] Test request logging output
- [ ] Test DB query logging (dev mode)




