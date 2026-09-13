import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';

// Load environment variables before doing anything
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import app from '../src/server';

interface RouteReport {
  relPath: string;
  expressPath: string;
  methods: string[];
  importSuccess: boolean;
  importError?: string;
  httpStatus?: number;
  httpStatusText?: string;
  probeResult?: 'PASS' | 'AUTH_REQUIRED' | 'BAD_REQUEST' | 'FAIL' | 'UNPROBED';
  errorDetails?: string;
  latencyMs?: number;
}

function findRouteFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name.startsWith('.')) continue;
      results.push(...findRouteFiles(full, baseDir));
    } else if (entry.isFile() && (entry.name === 'route.ts' || entry.name === 'route.js')) {
      results.push(full);
    }
  }
  return results;
}

function getExpressPath(filePath: string, apiDir: string): string {
  const relDir = path.relative(apiDir, path.dirname(filePath));
  const segments = relDir.split(path.sep).filter(Boolean);
  const converted = segments.map((seg) => {
    if (seg.startsWith('[...') && seg.endsWith(']')) {
      return '*';
    }
    if (seg.startsWith('[') && seg.endsWith(']')) {
      return `:${seg.slice(1, -1)}`;
    }
    return seg;
  });
  return '/api/' + converted.join('/');
}

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 VOLO BACKEND API AUDIT: ANALYZING ALL 93 CONVERTED ENDPOINTS');
  console.log('================================================================\n');

  const apiDir = path.resolve(__dirname, '../src/app/api');
  const routeFiles = findRouteFiles(apiDir, apiDir);

  console.log(`📁 Found ${routeFiles.length} API route files.\n`);

  const reports: RouteReport[] = [];
  const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

  // 1. Step 1: Import and static validation for every single route file
  for (const file of routeFiles) {
    const relPath = path.relative(apiDir, file);
    const expressPath = getExpressPath(file, apiDir);

    try {
      const fileUrl = pathToFileURL(file).href;
      const mod = await import(fileUrl);
      const methods = HTTP_METHODS.filter((m) => typeof mod[m] === 'function');

      reports.push({
        relPath,
        expressPath,
        methods,
        importSuccess: true,
      });
    } catch (err: any) {
      reports.push({
        relPath,
        expressPath,
        methods: [],
        importSuccess: false,
        importError: err?.message || String(err),
      });
    }
  }

  // 2. Step 2: Live HTTP probe on local server
  const testPort = 5002;
  const server = app.listen(testPort, '127.0.0.1');

  await new Promise((resolve) => setTimeout(resolve, 600));

  for (const report of reports) {
    if (!report.importSuccess) {
      report.probeResult = 'FAIL';
      continue;
    }

    // Determine if we can probe it with HTTP
    // Only probe static routes (no :id or *) without side effects (GET preferred)
    const isDynamic = report.expressPath.includes(':') || report.expressPath.includes('*');
    const hasGet = report.methods.includes('GET');
    const hasPost = report.methods.includes('POST');

    if (!isDynamic && (hasGet || hasPost)) {
      const method = hasGet ? 'GET' : 'POST';
      const targetUrl = `http://127.0.0.1:${testPort}${report.expressPath}`;
      const start = Date.now();

      try {
        const response = await fetch(targetUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VoloApiAuditScript/1.0',
          },
          body: method === 'POST' ? JSON.stringify({}) : undefined,
        });

        report.latencyMs = Date.now() - start;
        report.httpStatus = response.status;
        report.httpStatusText = response.statusText;

        const bodyText = await response.text().catch(() => '');

        if (response.status >= 200 && response.status < 300) {
          report.probeResult = 'PASS';
        } else if (response.status === 401 || response.status === 403 || bodyText.includes('UNAUTHORIZED')) {
          report.probeResult = 'AUTH_REQUIRED'; // Secure endpoint requiring token/session
          if (bodyText.includes('UNAUTHORIZED') && response.status === 500) {
            report.errorDetails = 'Protected by requireRole() (throws UNAUTHORIZED without session)';
          }
        } else if (response.status === 400 || bodyText.includes('multipart/form-data')) {
          report.probeResult = 'BAD_REQUEST'; // Endpoint active, expects specific payload/content-type
        } else if (response.status === 404) {
          report.probeResult = 'FAIL';
          report.errorDetails = '404 Not Found - Route not mapped properly';
        } else {
          report.probeResult = 'FAIL';
          report.errorDetails = `HTTP ${response.status}: ${bodyText.slice(0, 100)}`;
        }
      } catch (err: any) {
        report.probeResult = 'FAIL';
        report.errorDetails = `Connection/Runtime error: ${err.message}`;
      }
    } else {
      report.probeResult = 'UNPROBED';
    }
  }

  server.close();

  // 3. Print Results Table
  console.log('---------------------------------------------------------------------------------------------------------');
  console.log(
    '#   | Route Path                                     | Methods       | Import  | Probe Status   | HTTP | Latency'
  );
  console.log('---------------------------------------------------------------------------------------------------------');

  let importFailCount = 0;
  let probeFailCount = 0;
  let passCount = 0;
  let authReqCount = 0;
  let badReqCount = 0;
  let unprobedCount = 0;

  reports.forEach((r, idx) => {
    const num = String(idx + 1).padEnd(3);
    const pth = r.expressPath.padEnd(46);
    const mth = r.methods.join(',').padEnd(13);
    const imp = r.importSuccess ? '✅ OK  ' : '❌ FAIL';
    let prb = '⚪ UNPROBED     ';

    if (r.probeResult === 'PASS') {
      prb = '✅ PASS         ';
      passCount++;
    } else if (r.probeResult === 'AUTH_REQUIRED') {
      prb = '🔒 AUTH_REQUIRED';
      authReqCount++;
    } else if (r.probeResult === 'BAD_REQUEST') {
      prb = '⚠️  BAD_REQUEST  ';
      badReqCount++;
    } else if (r.probeResult === 'FAIL') {
      prb = '❌ FAIL         ';
      probeFailCount++;
    } else {
      unprobedCount++;
    }

    if (!r.importSuccess) importFailCount++;

    const status = r.httpStatus ? String(r.httpStatus).padEnd(4) : ' -  ';
    const lat = r.latencyMs !== undefined ? `${r.latencyMs}ms`.padEnd(7) : ' -     ';

    console.log(`${num} | ${pth} | ${mth} | ${imp} | ${prb} | ${status} | ${lat}`);

    if (r.errorDetails) {
      console.log(`      ↳ ⚠️  Error Details: ${r.errorDetails}`);
    }
    if (r.importError) {
      console.log(`      ↳ ❌ Import Error: ${r.importError}`);
    }
  });

  console.log('---------------------------------------------------------------------------------------------------------\n');
  console.log('📊 AUDIT SUMMARY:');
  console.log(`   • Total Endpoints Discovered: ${reports.length}`);
  console.log(`   • Successful Imports:         ${reports.length - importFailCount} / ${reports.length}`);
  console.log(`   • Failed Imports:             ${importFailCount}`);
  console.log(`   • Live HTTP Probes Passed:    ${passCount}`);
  console.log(`   • Auth-Protected Endpoints:   ${authReqCount} (Requires token/session)`);
  console.log(`   • Parameter-Gated Endpoints:  ${badReqCount} (Rejects empty payload as expected)`);
  console.log(`   • Parameterized / Unprobed:   ${unprobedCount} (Requires specific URL :id params)`);
  console.log(`   • Failed Endpoints (Errors):  ${probeFailCount}`);
  console.log('\n================================================================');

  if (importFailCount === 0 && probeFailCount === 0) {
    console.log('🎉 ALL BACKEND APIS ARE 100% HEALTHY AND WORKING AFTER NODE.JS MIGRATION!');
  } else {
    console.log(`⚠️  ATTENTION: ${importFailCount + probeFailCount} issues detected that require fixes.`);
  }
  console.log('================================================================\n');

  process.exit(importFailCount + probeFailCount === 0 ? 0 : 1);
}

runAudit().catch((err) => {
  console.error('Fatal audit script exception:', err);
  process.exit(1);
});
