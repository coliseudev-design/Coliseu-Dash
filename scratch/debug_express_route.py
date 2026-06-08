import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()
print(f"Container middleware: {MW}")

script = """
const express = require('express');
const db = require('./src/db/postgres');
const biRouter = require('./src/routes/bi');

// Mock req and res
const req = {
  tenant: { id: '816f97c4-66fb-4ef8-905d-e0551cbf2492' },
  user: { id: 546, layoutVersion: 'v1.0' },
  query: { period: 'thisMonth' },
  headers: { 'x-timezone-offset': '-180' }
};

const res = {
  json: function(data) {
    console.log('=== Response JSON ===');
    console.log(JSON.stringify(data, null, 2));
  },
  status: function(code) {
    console.log('Response Status:', code);
    return this;
  }
};

// Bind context as middleware would
const { bindDbContext } = require('./src/middleware/auth');
const next = async () => {
  // Find the route handler
  const route = biRouter.stack.find(s => s.route && s.route.path === '/sales/executive-summary');
  if (!route) {
    console.error('Route not found!');
    return;
  }
  
  // Intercept db.query to log it
  const originalQuery = db.query;
  db.query = function(text, params) {
    console.log('\\n--- Query executed ---');
    console.log(text.trim());
    console.log('Params:', params);
    return originalQuery.apply(this, arguments);
  };
  
  try {
    await route.route.stack[0].handle(req, res, (err) => {
      if (err) console.error('Route error:', err);
    });
  } catch (e) {
    console.error('Execution error:', e);
  }
};

bindDbContext(req, res, next);
"""

stdin, stdout, stderr = client.exec_command(f"docker exec -i {MW} node")
stdin.write(script)
stdin.close()

print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
client.close()
