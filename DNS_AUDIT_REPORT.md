# DNS Configuration Audit Report
**Domain:** `restocked.now`  
**Subdomain:** `app.restocked.now`  
**Date:** December 2, 2025

---

## 🔍 AUDIT CHECKLIST

### 1. Nameserver Check

**Expected Configuration:**
- **Vercel Nameservers:**
  - `ns1.vercel-dns.com`
  - `ns2.vercel-dns.com`

**How to Verify in Namecheap:**
1. Go to Namecheap → Domain List → `restocked.now` → Manage
2. Check "Nameservers" section
3. Should show: `ns1.vercel-dns.com` and `ns2.vercel-dns.com`

**If Using Custom Nameservers:**
- ✅ **CORRECT:** Domain uses Vercel nameservers → Vercel manages all DNS
- ❌ **INCORRECT:** Domain uses Namecheap nameservers → Must use fallback DNS records

**Propagation:**
- Nameserver changes can take **24-48 hours** to fully propagate
- Check propagation: https://www.whatsmydns.net/#NS/restocked.now

---

### 2. DNS Records Audit (Only if NOT using Vercel nameservers)

**If using Namecheap nameservers (fallback DNS), you need:**

#### Required CNAME Record for `app.restocked.now`:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | `app` | `<vercel-cname-value>` | Automatic |

**To get Vercel CNAME value:**
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `app.restocked.now`
3. Vercel will show a CNAME value (e.g., `cname.vercel-dns.com` or `your-project.vercel-dns.com`)
4. Copy this value

**Common Issues:**
- ❌ **Duplicate CNAME records** - Delete old/incorrect ones
- ❌ **Wrong CNAME value** - Must match exactly what Vercel shows
- ❌ **A record instead of CNAME** - Delete A record, use CNAME
- ❌ **Missing CNAME** - Add the CNAME record

**Root Domain (`restocked.now`):**
- If using Vercel nameservers: Vercel handles this automatically
- If using Namecheap nameservers: Add CNAME record pointing to Vercel

---

### 3. Vercel Domain State Audit

**Check in Vercel Dashboard:**
1. Go to Vercel → Your Project → Settings → Domains
2. Look for `app.restocked.now`

**Possible States:**

#### ✅ "Valid Configuration"
- Domain is correctly configured
- SSL certificate issued
- Domain is active

#### ⚠️ "DNS Change Recommended"
**Why this appears:**
- DNS records don't match what Vercel expects
- Nameservers not pointing to Vercel
- CNAME record incorrect or missing
- DNS propagation still in progress

**What to do:**
1. Verify nameservers are correct (if using Vercel nameservers)
2. Verify CNAME record is correct (if using fallback DNS)
3. Wait for DNS propagation (5-60 minutes)
4. Click "Refresh" in Vercel dashboard

#### ❌ "Invalid Configuration"
- DNS records are incorrect
- Domain not pointing to Vercel
- Nameservers not configured

---

## 📋 REQUIRED ACTIONS CHECKLIST

### If Using Vercel Nameservers (Recommended)

- [ ] **Verify Nameservers in Namecheap**
  - Should show: `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
  - If not, update them and wait 24-48 hours

- [ ] **Add Domain in Vercel**
  - Go to Vercel → Project → Settings → Domains
  - Add: `app.restocked.now`
  - Vercel will automatically configure DNS

- [ ] **Wait for Propagation**
  - Nameserver changes: 24-48 hours
  - DNS record changes: 5-60 minutes

- [ ] **Verify in Vercel**
  - Check domain status shows "Valid Configuration"
  - SSL certificate should be issued automatically

### If Using Namecheap Nameservers (Fallback DNS)

- [ ] **Delete Old/Incorrect Records**
  - Remove any old CNAME records for `app`
  - Remove any A records for `app` (if present)

- [ ] **Add Correct CNAME Record**
  - Host: `app`
  - Value: `<exact-value-from-vercel>` (e.g., `cname.vercel-dns.com`)
  - TTL: Automatic

- [ ] **Add Domain in Vercel**
  - Go to Vercel → Project → Settings → Domains
  - Add: `app.restocked.now`
  - Copy the CNAME value shown

- [ ] **Wait for Propagation**
  - DNS changes: 5-60 minutes
  - Check: https://www.whatsmydns.net/#CNAME/app.restocked.now

- [ ] **Refresh in Vercel**
  - Click "Refresh" button in Vercel domain settings
  - Vercel will re-scan DNS

---

## 🔧 TROUBLESHOOTING

### Issue: "DNS Change Recommended" Still Shows

**Possible Causes:**
1. DNS propagation not complete (wait longer)
2. CNAME record value doesn't match Vercel exactly
3. Nameservers not pointing to Vercel
4. Cached DNS records

**Solutions:**
1. Wait 5-60 minutes for propagation
2. Double-check CNAME value matches Vercel exactly
3. Verify nameservers are correct
4. Clear DNS cache: `sudo dscacheutil -flushcache` (macOS)
5. Click "Refresh" in Vercel dashboard

### Issue: Domain Not Resolving

**Check:**
1. DNS propagation: https://www.whatsmydns.net/#CNAME/app.restocked.now
2. Vercel domain status
3. Nameserver configuration
4. CNAME record value

**Solutions:**
1. Wait for DNS propagation
2. Verify CNAME record is correct
3. Check Vercel project is deployed
4. Verify domain is added in Vercel

### Issue: SSL Certificate Not Issued

**Causes:**
- DNS not properly configured
- Domain not resolving correctly
- Vercel hasn't detected DNS changes

**Solutions:**
1. Ensure DNS is correctly configured
2. Wait for DNS propagation
3. Click "Refresh" in Vercel
4. Vercel will automatically issue SSL once DNS is correct

---

## ✅ VERIFICATION STEPS

### Step 1: Check Nameservers
```bash
dig NS restocked.now +short
```
**Expected:** Should show `ns1.vercel-dns.com` and `ns2.vercel-dns.com`

### Step 2: Check CNAME Record
```bash
dig CNAME app.restocked.now +short
```
**Expected:** Should show Vercel CNAME value (e.g., `cname.vercel-dns.com`)

### Step 3: Check Domain Resolution
```bash
dig app.restocked.now +short
```
**Expected:** Should resolve to Vercel IP addresses

### Step 4: Check Vercel Dashboard
- Go to Vercel → Project → Settings → Domains
- Verify `app.restocked.now` shows "Valid Configuration"
- Check SSL certificate status

### Step 5: Test Domain Access
- Visit: `https://app.restocked.now`
- Should load your Vercel deployment
- Check browser console for errors

---

## 🎯 FINAL ANSWER

### Is the Domain Configuration Correct?

**To determine this, check:**

1. **Nameservers:**
   - ✅ Using Vercel nameservers → Configuration is correct
   - ❌ Using Namecheap nameservers → Need to verify CNAME records

2. **DNS Records (if using Namecheap nameservers):**
   - ✅ CNAME record exists and points to Vercel → Configuration is correct
   - ❌ No CNAME or wrong value → Configuration is incorrect

3. **Vercel Domain Status:**
   - ✅ "Valid Configuration" → Everything is correct
   - ⚠️ "DNS Change Recommended" → May need to wait or fix DNS
   - ❌ "Invalid Configuration" → DNS is incorrect

4. **Domain Resolution:**
   - ✅ `app.restocked.now` resolves → Configuration is correct
   - ❌ Domain doesn't resolve → Wait for propagation or fix DNS

**Most Common Issue:**
- Using Namecheap nameservers but CNAME record is incorrect or missing
- Solution: Add correct CNAME record or switch to Vercel nameservers

---

## 📝 QUICK REFERENCE

### Vercel Nameservers (Recommended)
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

### CNAME Record (If using Namecheap nameservers)
```
Type: CNAME
Host: app
Value: <from-vercel-dashboard>
TTL: Automatic
```

### Expected Propagation Times
- Nameserver changes: 24-48 hours
- DNS record changes: 5-60 minutes
- SSL certificate: Automatic after DNS is correct

---

**Report Generated:** December 2, 2025  
**Next Steps:** Run DNS audit script and verify configuration in Namecheap dashboard



