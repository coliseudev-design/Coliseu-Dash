import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
mw = stdout.read().decode('utf-8').strip()

node_script = (
    "const jwt = require('jsonwebtoken');"
    "const http = require('http');"
    "const secret = process.env.JWT_DEVICE_KEY;"
    
    # Helper to sign token and call API
    "const testTenant = (tenantId, layoutVersion) => {"
    "  const token = jwt.sign({"
    "    tenantId: tenantId,"
    "    module: 'coliseu-dash',"
    "    userId: 1,"
    "    layoutVersion: layoutVersion"
    "  }, secret);"
    
    "  const options = {"
    "    hostname: 'localhost',"
    "    port: 3200,"
    "    path: '/api/estatisticas/overview?period=custom&start_date=2025-12-01&end_date=2025-12-31',"
    "    method: 'GET',"
    "    headers: {"
    "      'Authorization': 'Bearer ' + token"
    "    }"
    "  };"
    
    "  const req = http.request(options, (res) => {"
    "    let data = '';"
    "    res.on('data', (chunk) => data += chunk);"
    "    res.on('end', () => {"
    "      console.log('=== TENANT: ' + tenantId + ' (layoutVersion: ' + layoutVersion + ') ===');"
    "      console.log(data);"
    "    });"
    "  });"
    "  req.on('error', (e) => console.error(e));"
    "  req.end();"
    "};"
    
    # Test both tenants with v1.0 and v4.0 layout versions
    "testTenant('a822a7e7-fdd4-4483-bbb5-26587a72739f', 'v4.0');"
    "setTimeout(() => testTenant('ed1d3a98-4c4d-48db-99c0-8751926eb8e5', 'v4.0'), 1000);"
    "setTimeout(() => testTenant('a822a7e7-fdd4-4483-bbb5-26587a72739f', 'v1.0'), 2000);"
    "setTimeout(() => testTenant('ed1d3a98-4c4d-48db-99c0-8751926eb8e5', 'v1.0'), 3000);"
)

cmd = f"docker exec {mw} node -e \"{node_script}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))
client.close()
