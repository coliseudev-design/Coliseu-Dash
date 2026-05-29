const https = require('https');

const BASE_URL = "https://dashboard.coliseusistemas.com.br";
const EMAIL = "thiago@vet.com.br";
const PASSWORD = "123456";

// Disable SSL certificate verification for this test
const agent = new https.Agent({
  rejectUnauthorized: false
});

function post(url, data) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname,
      method: 'POST',
      agent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          resolve(raw);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'GET',
      agent,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          resolve(raw);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log("Logging in...");
    const loginRes = await post(`${BASE_URL}/api/auth/login`, { email: EMAIL, password: PASSWORD });
    if (!loginRes || !loginRes.token) {
      console.error("Login failed:", loginRes);
      return;
    }
    const token = loginRes.token;
    const user = loginRes.user;
    console.log(`Logged in! User: ${user.nome}, Tenant: ${user.tenant_id}, Layout: ${user.layout_version}`);

    console.log("\n--- Testing /api/estatisticas/overview ---");
    const overviewRes = await get(`${BASE_URL}/api/estatisticas/overview?period=custom&start_date=2025-12-01&end_date=2025-12-31`, token);
    console.log("Response:", JSON.dumps ? JSON.stringify(overviewRes, null, 2) : overviewRes);

    console.log("\n--- Testing /api/estatisticas/kpis ---");
    const kpisRes = await get(`${BASE_URL}/api/estatisticas/kpis?period=custom&start_date=2025-12-01&end_date=2025-12-31`, token);
    console.log("Response:", JSON.dumps ? JSON.stringify(kpisRes, null, 2) : kpisRes);

  } catch (err) {
    console.error("Error in main:", err);
  }
}

main();
