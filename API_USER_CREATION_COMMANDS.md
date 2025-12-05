# API User Creation Commands

**Backend URL:** `https://restockednew-production.up.railway.app`  
**User:** `admin@test.com` / `TestPassword123!`

---

## Option 1: Node.js Scripts (Recommended)

### Create User

```bash
node scripts/create-user-via-api.js
```

### Verify Login

```bash
node scripts/verify-login.js
```

---

## Option 2: cURL Commands

### Create User (Register)

```bash
curl -X POST "https://restockednew-production.up.railway.app/auth/register" \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"admin@test.com","password":"TestPassword123!"}'
```

**Expected Response (201 Created):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "admin@test.com",
    "plan": "free",
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**If User Already Exists (409 Conflict):**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Email already registered"
  }
}
```

### Verify Login

```bash
curl -X POST "https://restockednew-production.up.railway.app/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"admin@test.com","password":"TestPassword123!"}'
```

**Expected Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "admin@test.com",
    "plan": "free",
    "created_at": "2025-12-04T...",
    "updated_at": "2025-12-04T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**If Invalid Credentials (401 Unauthorized):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

---

## Option 3: Bash Script (All-in-One)

```bash
bash scripts/api-commands.sh
```

This script will:
1. Create the user via `/auth/register`
2. Verify login via `/auth/login`

---

## Pretty-Printed cURL (with jq)

### Create User

```bash
curl -X POST "https://restockednew-production.up.railway.app/auth/register" \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"admin@test.com","password":"TestPassword123!"}' \
  | jq '.'
```

### Verify Login

```bash
curl -X POST "https://restockednew-production.up.railway.app/auth/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://app.restocked.now" \
  -d '{"email":"admin@test.com","password":"TestPassword123!"}' \
  | jq '.'
```

---

## Quick Test Sequence

1. **Create user:**
   ```bash
   node scripts/create-user-via-api.js
   ```

2. **Verify login:**
   ```bash
   node scripts/verify-login.js
   ```

3. **Login in browser:**
   - Go to: https://app.restocked.now/login
   - Email: `admin@test.com`
   - Password: `TestPassword123!`

---

## Notes

- **CORS:** The `Origin` header is included to match the frontend origin
- **Rate Limiting:** The API has rate limiting (100 requests per 15 minutes)
- **User Already Exists:** If you get 409, the user was already created (this is OK)
- **Password Requirements:** Minimum 6 characters (no other requirements)

---

**Last Updated:** December 4, 2025



