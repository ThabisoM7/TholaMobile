const http = require('http');

// Target configuration (falls back to 5000, then 3000)
const API_PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${API_PORT}`;

console.log(`\n🛡️ Starting Thola Threat-Modeling Verification Suite...`);
console.log(`🔌 Target server: ${BASE_URL}`);

// Helper to make request and return promise
function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Insecure Access Control Spoofing (OWASP A01)
  // Attempt to write a review with invalid header authentication tokens
  totalTests++;
  console.log('\n🔒 Test 1: Testing Broken Access Control Authentication Blocks...');
  try {
    const res = await makeRequest('POST', '/reviews', {
      'Authorization': 'Bearer INVALID_JWT_SECRET_TOKEN'
    }, {
      productId: 'p-1',
      rating: 5,
      comment: 'Excellent!'
    });

    if (res.statusCode === 401 || res.statusCode === 403) {
      console.log(`✅ PASS: Invalid authentication blocked successfully with HTTP ${res.statusCode}.`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: API allowed review mutation without validated token. Status Code: ${res.statusCode}`);
    }
  } catch (err) {
    console.log(`⚠️ Script check failed: ${err.message}`);
  }

  // Test 2: SQL & XSS Injection Protection Validation (OWASP A03)
  // Attempt to pass malicious injection sequences
  totalTests++;
  console.log('\n💉 Test 2: Testing Injection Parameter Interceptions...');
  try {
    const res = await makeRequest('POST', '/auth/login', {}, {
      email: "' OR 1=1 --",
      password: '<script>alert("hack")</script>'
    });

    // The API should handle this defensively (e.g. invalid login response 400 or 401, not crashing or executing SQL)
    if (res.statusCode === 400 || res.statusCode === 401) {
      console.log(`✅ PASS: Injection parameters intercepted safely. Returned HTTP ${res.statusCode} standard error.`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: Injection caused server state error or unhandled response. Status Code: ${res.statusCode}`);
    }
  } catch (err) {
    console.log(`⚠️ Script check failed: ${err.message}`);
  }

  // Test 3: Rate Limiter Throttling (OWASP A04)
  // We will hit the /auth/login route multiple times rapidly to test throttling limit
  totalTests++;
  console.log('\n🔥 Test 3: Testing Authentication Rate Limiting Throttling...');
  try {
    let triggeredLimiter = false;
    let statusCode = 200;

    // Send 25 consecutive mock requests
    for (let i = 0; i < 25; i++) {
      const res = await makeRequest('POST', '/auth/login', {}, { email: 'test@thola.com', password: 'wrong' });
      statusCode = res.statusCode;
      if (res.statusCode === 429) {
        triggeredLimiter = true;
        break;
      }
    }

    if (triggeredLimiter) {
      console.log('✅ PASS: Rate Limiter triggered! Blocked flooding with HTTP 429.');
      passedTests++;
    } else {
      console.log(`❌ FAIL: Rate Limiter did not trigger. Final Status Code: ${statusCode}`);
    }
  } catch (err) {
    console.log(`⚠️ Server check failed (is the backend dev server active?): ${err.message}`);
  }

  // Summary
  console.log('\n=========================================');
  console.log(`🏆 Threat-Modeling Verification Finished: ${passedTests}/${totalTests} Tests Passed.`);
  console.log('=========================================\n');
}

runTests();
