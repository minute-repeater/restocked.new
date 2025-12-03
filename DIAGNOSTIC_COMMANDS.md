# Supabase Connection Diagnostic Commands

## 🔍 Step-by-Step Diagnostic Process

### Step 1: Verify Hostname Format
✅ **Hostname**: `db.houlnusxqoupkaulciiw.supabase.co`
- Format: `db.{project-ref}.supabase.co`
- Status: Format appears valid

---

### Step 2: Run Standalone Connection Test

**Script Created**: `supabase-test.js`

**Run Command**:
```bash
node --import dotenv/config supabase-test.js
```

**Note**: Uses `--import` instead of `-r` because project uses ES modules

**What it does**:
- Loads DATABASE_URL from .env
- Parses connection string
- Attempts PostgreSQL connection
- Runs SELECT 1 query
- Provides detailed error information

**Expected Output**:
- ✅ Success: Connection established and query works
- ❌ Failure: Detailed error with code, address, port, stack trace

---

### Step 3: DNS & Network Connectivity Tests

Run these commands **on your machine** and paste the results:

#### 3a. Ping Test
```bash
ping -c 4 db.houlnusxqoupkaulciiw.supabase.co
```

**What to look for**:
- ✅ Success: Receives ICMP replies
- ❌ Failure: "Unknown host" or "Request timeout"

#### 3b. DNS Lookup (nslookup)
```bash
nslookup db.houlnusxqoupkaulciiw.supabase.co
```

**What to look for**:
- ✅ Success: Returns IP address(es)
- ❌ Failure: "Non-existent domain" or no response

#### 3c. DNS Lookup (dig)
```bash
dig db.houlnusxqoupkaulciiw.supabase.co
```

**What to look for**:
- ✅ Success: Returns A/AAAA records with IP addresses
- ❌ Failure: "NXDOMAIN" or no answer section

---

### Step 4: Manual PostgreSQL Connection Test

**Password**: `JASMINE£$£$£$!`
**URL-Encoded Password**: `JASMINE%C2%A3%24%C2%A3%24%C2%A3%24!`

#### Option A: With Original Password (if psql handles special chars)
```bash
psql "postgresql://postgres:JASMINE£\$£\$£\$!@db.houlnusxqoupkaulciiw.supabase.co:5432/postgres" -c "SELECT 1;"
```

#### Option B: With URL-Encoded Password (recommended)
```bash
psql "postgresql://postgres:JASMINE%C2%A3%24%C2%A3%24%C2%A3%24!@db.houlnusxqoupkaulciiw.supabase.co:5432/postgres" -c "SELECT 1;"
```

**What to look for**:
- ✅ Success: Returns `1` and exits
- ❌ Failure: Connection error message

**Note**: If `psql` is not installed:
```bash
# macOS
brew install postgresql

# Or use Docker
docker run -it --rm postgres psql "postgresql://postgres:JASMINE%C2%A3%24%C2%A3%24%C2%A3%24!@db.houlnusxqoupkaulciiw.supabase.co:5432/postgres" -c "SELECT 1;"
```

---

### Step 5: Password URL Encoding

**Original**: `JASMINE£$£$£$!`
**URL-Encoded**: `JASMINE%C2%A3%24%C2%A3%24%C2%A3%24!`

**Character Breakdown**:
- `£` → `%C2%A3` (UTF-8 encoding)
- `$` → `%24`
- `!` → `!` (no encoding needed)

**Test encoding**:
```bash
node -e "console.log(encodeURIComponent('JASMINE£\$£\$£\$!'))"
```

**Should password be URL-encoded?**
- ✅ **YES** - Special characters (`£`, `$`) should be URL-encoded in connection strings
- The `pg` library may handle some special chars, but URL encoding is safer
- Supabase connection strings typically require URL encoding

---

### Step 6: Possible Connectivity Blockers

#### 🔴 Critical Blockers

1. **Supabase Project Paused**
   - Check Supabase dashboard → Project Settings
   - Free tier projects pause after inactivity
   - **Fix**: Wake up project in dashboard

2. **Supabase Free Tier Sleeping**
   - Free tier databases sleep after 1 week of inactivity
   - **Fix**: Access dashboard to wake database, or upgrade to Pro

3. **IP Allowlist Blocking**
   - Supabase may have IP allowlist enabled
   - Your current IP is not in the allowlist
   - **Fix**: Add your IP to Supabase → Settings → Database → Connection Pooling → Allowed IPs

#### 🟡 Network Blockers

4. **Network Firewall**
   - Corporate/school firewall blocking port 5432
   - **Check**: Try from different network (mobile hotspot)
   - **Fix**: Contact network admin or use VPN

5. **ISP Blocks Port 5432**
   - Some ISPs block PostgreSQL port
   - **Check**: Try from different network
   - **Fix**: Use Supabase connection pooler (port 6543) or VPN

6. **macOS Firewall**
   - System Settings → Network → Firewall blocking outbound connections
   - **Check**: `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate`
   - **Fix**: Allow Node.js/PostgreSQL in firewall settings

7. **VPN/Proxy Interference**
   - VPN routing issues or proxy blocking
   - **Check**: Disable VPN temporarily
   - **Fix**: Configure VPN to allow database connections

#### 🟢 Technical Blockers

8. **IPv6 Issues**
   - System trying IPv6 but IPv6 not properly configured
   - **Check**: Error shows IPv6 address (`2600:1f13:...`)
   - **Fix**: Force IPv4 in connection string or system settings

9. **Incorrect Database Region**
   - Database in different region causing latency/routing issues
   - **Check**: Supabase dashboard → Project Settings → Region
   - **Fix**: Verify region matches your location

10. **DNS Resolution Failure**
    - Cannot resolve `db.houlnusxqoupkaulciiw.supabase.co`
    - **Check**: Run `nslookup` and `dig` commands
    - **Fix**: Try different DNS server (8.8.8.8) or check DNS settings

---

## 📋 Tests You Need to Run

### On Your Machine, Run These Commands:

1. **Connection Test Script**:
   ```bash
   node -r dotenv/config supabase-test.js
   ```
   **Paste**: Full output including error details

2. **DNS Tests**:
   ```bash
   ping -c 4 db.houlnusxqoupkaulciiw.supabase.co
   nslookup db.houlnusxqoupkaulciiw.supabase.co
   dig db.houlnusxqoupkaulciiw.supabase.co
   ```
   **Paste**: All three outputs

3. **Manual psql Test** (if psql installed):
   ```bash
   psql "postgresql://postgres:JASMINE%C2%A3%24%C2%A3%24%C2%A3%24!@db.houlnusxqoupkaulciiw.supabase.co:5432/postgres" -c "SELECT 1;"
   ```
   **Paste**: Full output

4. **Check macOS Firewall**:
   ```bash
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
   ```
   **Paste**: Output

5. **Check Network Interface**:
   ```bash
   ifconfig | grep -A 5 "inet "
   ```
   **Paste**: Your IP addresses

---

## 📤 What to Paste Back

After running the tests above, please provide:

1. ✅ **Connection test script output** (full output from `node -r dotenv/config supabase-test.js`)

2. ✅ **DNS test results**:
   - `ping` output
   - `nslookup` output  
   - `dig` output

3. ✅ **psql test result** (if you have psql installed)

4. ✅ **Firewall status** (from macOS firewall check)

5. ✅ **Your current IP address** (from ifconfig)

6. ✅ **Supabase dashboard status**:
   - Is project active or paused?
   - Is database sleeping?
   - What region is the database in?
   - Is IP allowlist enabled?

---

## 🔧 Quick Fixes to Try

### Fix 1: Update .env with URL-Encoded Password
```bash
DATABASE_URL=postgresql://postgres:JASMINE%C2%A3%24%C2%A3%24%C2%A3%24!@db.houlnusxqoupkaulciiw.supabase.co:5432/postgres
```

### Fix 2: Try Supabase Connection Pooler (if available)
```bash
DATABASE_URL=postgresql://postgres:JASMINE%C2%A3%24%C2%A3%24%C2%A3%24!@db.houlnusxqoupkaulciiw.supabase.co:6543/postgres?pgbouncer=true
```

### Fix 3: Force IPv4 (if IPv6 issue)
Add to connection string: `?options=-c%20ip_family=ipv4`

---

## 🎯 Most Likely Issues (Based on Error)

Given the `EHOSTUNREACH` error with IPv6 address:

1. **IPv6 connectivity issue** (most likely)
2. **Supabase project paused/sleeping**
3. **IP allowlist blocking**
4. **Network firewall blocking port 5432**

Run the diagnostic tests above to narrow down the exact cause.

