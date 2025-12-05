#!/usr/bin/env node
/**
 * DNS Configuration Audit Tool
 * Verifies Vercel + Namecheap DNS setup for restocked.now
 */

import { execSync } from 'child_process';
import dns from 'dns/promises';

const DOMAIN = 'restocked.now';
const SUBDOMAIN = 'app.restocked.now';
const VERCEL_NAMESERVERS = [
  'ns1.vercel-dns.com',
  'ns2.vercel-dns.com',
  'ns1.vercel-dns-3.com',
  'ns2.vercel-dns-3.com',
  'ns3.vercel-dns-3.com',
  'ns4.vercel-dns-3.com',
];

interface AuditResult {
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
  details?: any;
}

const results: AuditResult[] = [];

function logResult(check: string, status: 'pass' | 'fail' | 'warning' | 'info', message: string, details?: any) {
  results.push({ check, status, message, details });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${icon} ${check}: ${message}`);
  if (details) {
    console.log(`   ${JSON.stringify(details, null, 2)}`);
  }
}

async function checkNameservers() {
  console.log('\n1. Nameserver Check\n');
  
  try {
    const nsRecords = await dns.resolveNs(DOMAIN);
    
    logResult(
      'Nameserver Resolution',
      'info',
      `Found ${nsRecords.length} nameservers`,
      { nameservers: nsRecords }
    );

    const usingVercelNS = nsRecords.some(ns => 
      VERCEL_NAMESERVERS.some(vns => ns.toLowerCase().includes(vns.toLowerCase()))
    );

    if (usingVercelNS) {
      logResult(
        'Vercel Nameservers',
        'pass',
        'Domain is using Vercel nameservers',
        { nameservers: nsRecords }
      );
    } else {
      logResult(
        'Vercel Nameservers',
        'fail',
        'Domain is NOT using VercEL nameservers',
        { 
          current: nsRecords,
          expected: VERCEL_NAMESERVERS,
          action: 'Update nameservers in Namecheap to use Vercel nameservers'
        }
      );
    }

    // Check if all nameservers match Vercel
    const allMatchVercel = nsRecords.every(ns => 
      VERCEL_NAMESERVERS.some(vns => ns.toLowerCase().includes(vns.toLowerCase()))
    );

    if (allMatchVercel && nsRecords.length >= 2) {
      logResult(
        'Nameserver Configuration',
        'pass',
        'All nameservers correctly configured for Vercel'
      );
    } else if (usingVercelNS) {
      logResult(
        'Nameserver Configuration',
        'warning',
        'Some nameservers may not be Vercel (mixed configuration)',
        { nameservers: nsRecords }
      );
    }
  } catch (error: any) {
    logResult(
      'Nameserver Check',
      'fail',
      'Failed to resolve nameservers',
      { error: error.message }
    );
  }
}

async function checkDNSRecords() {
  console.log('\n2. DNS Records Check\n');

  try {
    // Check CNAME for app.restocked.now
    try {
      const cnameRecords = await dns.resolveCname(SUBDOMAIN);
      logResult(
        'CNAME Record (app.restocked.now)',
        'info',
        `Found CNAME records`,
        { records: cnameRecords }
      );

      const hasVercelCNAME = cnameRecords.some(record => 
        record.toLowerCase().includes('vercel') || 
        record.toLowerCase().includes('cname.vercel-dns.com')
      );

      if (hasVercelCNAME) {
        logResult(
          'Vercel CNAME',
          'pass',
          'CNAME points to Vercel',
          { cname: cnameRecords }
        );
      } else {
        logResult(
          'Vercel CNAME',
          'warning',
          'CNAME may not point to Vercel',
          { cname: cnameRecords, expected: 'cname.vercel-dns.com or similar' }
        );
      }
    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
        logResult(
          'CNAME Record (app.restocked.now)',
          'fail',
          'No CNAME record found for app.restocked.now',
          { action: 'Add CNAME record in Namecheap pointing to Vercel' }
        );
      } else {
        logResult(
          'CNAME Record',
          'warning',
          'Could not resolve CNAME',
          { error: error.message }
        );
      }
    }

    // Check A records for root domain
    try {
      const aRecords = await dns.resolve4(DOMAIN);
      logResult(
        'A Records (restocked.now)',
        'info',
        `Found ${aRecords.length} A records`,
        { records: aRecords }
      );

      // Vercel typically uses CNAME, not A records for root domain
      if (aRecords.length > 0) {
        logResult(
          'Root Domain Records',
          'warning',
          'Root domain has A records (Vercel typically uses CNAME)',
          { 
            records: aRecords,
            note: 'If using Vercel nameservers, root domain should use CNAME or be handled by Vercel'
          }
        );
      }
    } catch (error: any) {
      logResult(
        'A Records',
        'info',
        'No A records found (may be using CNAME)',
        { error: error.code }
      );
    }
  } catch (error: any) {
    logResult(
      'DNS Records Check',
      'fail',
      'Failed to check DNS records',
      { error: error.message }
    );
  }
}

async function checkDomainResolution() {
  console.log('\n3. Domain Resolution Check\n');

  try {
    // Check if app.restocked.now resolves
    try {
      const addresses = await dns.resolve4(SUBDOMAIN);
      logResult(
        'Domain Resolution (app.restocked.now)',
        'pass',
        'Domain resolves to IP addresses',
        { addresses }
      );
    } catch (error: any) {
      logResult(
        'Domain Resolution (app.restocked.now)',
        'fail',
        'Domain does not resolve',
        { 
          error: error.message,
          action: 'Wait for DNS propagation or check DNS configuration'
        }
      );
    }

    // Check root domain
    try {
      const rootAddresses = await dns.resolve4(DOMAIN);
      logResult(
        'Domain Resolution (restocked.now)',
        'pass',
        'Root domain resolves',
        { addresses: rootAddresses }
      );
    } catch (error: any) {
      logResult(
        'Domain Resolution (restocked.now)',
        'warning',
        'Root domain may not resolve',
        { error: error.message }
      );
    }
  } catch (error: any) {
    logResult(
      'Domain Resolution',
      'fail',
      'Failed to check domain resolution',
      { error: error.message }
    );
  }
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('DNS CONFIGURATION AUDIT REPORT');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  console.log(`Total Checks: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}\n`);

  console.log('\nDetailed Results:\n');
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : result.status === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${index + 1}. ${icon} ${result.check}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();
  });

  // Required Actions
  const failures = results.filter(r => r.status === 'fail');
  const criticalWarnings = results.filter(r => r.status === 'warning' && r.check.includes('Nameserver'));

  if (failures.length > 0 || criticalWarnings.length > 0) {
    console.log('\n🚨 REQUIRED ACTIONS:\n');
    
    if (failures.some(r => r.check.includes('Nameserver'))) {
      console.log('1. Update Nameservers in Namecheap:');
      console.log('   - Go to Namecheap → Domain List → restocked.now → Manage');
      console.log('   - Change nameservers to:');
      VERCEL_NAMESERVERS.forEach(ns => console.log(`     - ${ns}`));
      console.log('   - Wait 24-48 hours for propagation\n');
    }

    if (failures.some(r => r.check.includes('CNAME'))) {
      console.log('2. Add CNAME Record in Namecheap:');
      console.log('   - Go to Advanced DNS');
      console.log('   - Add CNAME record:');
      console.log('     Host: app');
      console.log('     Value: <vercel-cname-value> (from Vercel dashboard)');
      console.log('     TTL: Automatic\n');
    }

    if (failures.some(r => r.check.includes('Resolution'))) {
      console.log('3. Wait for DNS Propagation:');
      console.log('   - DNS changes can take 5-60 minutes');
      console.log('   - Check propagation: https://www.whatsmydns.net/#CNAME/app.restocked.now');
      console.log('   - Vercel will auto-detect when DNS is ready\n');
    }
  } else {
    console.log('\n✅ DNS Configuration appears correct!\n');
    console.log('Next Steps:');
    console.log('1. Verify domain in Vercel dashboard');
    console.log('2. Check SSL certificate status');
    console.log('3. Test domain access\n');
  }

  console.log('='.repeat(80));
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('DNS Configuration Audit');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Domain: ${DOMAIN}`);
  console.log(`Subdomain: ${SUBDOMAIN}\n`);

  await checkNameservers();
  await checkDNSRecords();
  await checkDomainResolution();

  generateReport();

  const hasFailures = results.some(r => r.status === 'fail');
  process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

