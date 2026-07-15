const http = require('http');
const https = require('https');

// Target URLs for a realistic page load simulation
const BASE_URL = 'https://marketplace-mbg-sangar.vercel.app/lelang';
const API_URL = 'https://marketplace-mbg-sangar.vercel.app/lelang/api/items?limit=20';

// Helper to format bytes to human readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Perform a single HTTP GET request and measure response size
function makeRequest(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      let dataSize = 0;
      
      // Attempt to read content-length header
      const contentLength = res.headers['content-length'];
      if (contentLength) {
        dataSize = parseInt(contentLength, 10);
      }

      // Buffer data to verify size if content-length header is not provided
      res.on('data', (chunk) => {
        if (!contentLength) {
          dataSize += chunk.length;
        }
      });

      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          success: res.statusCode === 200,
          statusCode: res.statusCode,
          size: dataSize,
          duration,
        });
      });
    }).on('error', (err) => {
      resolve({
        success: false,
        statusCode: 500,
        size: 0,
        duration: Date.now() - start,
        error: err.message,
      });
    });
  });
}

// Simulates a single "User Page Load" transaction (HTML + API Catalog fetch)
async function simulateUserVisit() {
  const [htmlResult, apiResult] = await Promise.all([
    makeRequest(BASE_URL),
    makeRequest(API_URL)
  ]);

  return {
    success: htmlResult.success && apiResult.success,
    htmlStatus: htmlResult.statusCode,
    apiStatus: apiResult.statusCode,
    htmlSize: htmlResult.size,
    apiSize: apiResult.size,
    totalSize: htmlResult.size + apiResult.size,
    duration: Math.max(htmlResult.duration, apiResult.duration)
  };
}

// Delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mode A: Sequential Hits
async function runSequentialMode() {
  console.log(`\nStarting Mode A: Sequential Hit Test (100 visits, 200ms delay)...`);
  const start = Date.now();
  
  let successCount = 0;
  let failCount = 0;
  let totalBytes = 0;
  let totalDuration = 0;

  for (let i = 1; i <= 100; i++) {
    const result = await simulateUserVisit();
    if (result.success) {
      successCount++;
      totalBytes += result.totalSize;
    } else {
      failCount++;
    }
    totalDuration += result.duration;
    
    process.stdout.write(`\rProgress: ${i}/100 visits | Successful: ${successCount} | Failed: ${failCount} | Total Bytes: ${formatBytes(totalBytes)}`);
    await sleep(200);
  }

  const executionTime = (Date.now() - start) / 1000;
  printSummary('Mode A: Sequential Hit Test', successCount, failCount, executionTime, totalBytes);
}

// Mode B: Concurrent Burst
async function runConcurrentMode() {
  console.log(`\nStarting Mode B: Concurrent Burst Test (30 simultaneous virtual users)...`);
  const start = Date.now();

  const promises = Array.from({ length: 30 }).map(() => simulateUserVisit());
  const results = await Promise.all(promises);

  let successCount = 0;
  let failCount = 0;
  let totalBytes = 0;

  results.forEach(result => {
    if (result.success) {
      successCount++;
      totalBytes += result.totalSize;
    } else {
      failCount++;
    }
  });

  const executionTime = (Date.now() - start) / 1000;
  printSummary('Mode B: Concurrent Burst Test', successCount, failCount, executionTime, totalBytes);
}

function printSummary(modeName, success, fail, timeSec, bytes) {
  console.log(`\n\n==================================================`);
  console.log(` SUMMARY - ${modeName.toUpperCase()}`);
  console.log(`==================================================`);
  console.log(`- Total Successful Page Loads : ${success}`);
  console.log(`- Total Failed Page Loads     : ${fail}`);
  console.log(`- Total Execution Time        : ${timeSec.toFixed(2)} seconds`);
  console.log(`- Total Data Transferred      : ${formatBytes(bytes)}`);
  console.log(`- Average Data per Page Load  : ${formatBytes(success > 0 ? bytes / success : 0)}`);
  console.log(`==================================================\n`);
}

async function main() {
  const mode = process.argv[2] ? process.argv[2].toUpperCase() : 'A';

  console.log(`==================================================`);
  console.log(` AUTOMATED BANDWIDTH & LOAD TESTING BENCHMARK      `);
  console.log(`==================================================`);
  console.log(`Target HTML URL : ${BASE_URL}`);
  console.log(`Target API URL  : ${API_URL}`);
  
  if (mode === 'A') {
    await runSequentialMode();
  } else if (mode === 'B') {
    await runConcurrentMode();
  } else {
    console.log(`Invalid mode specified. Please use 'A' or 'B'.`);
  }
}

main().catch(console.error);
