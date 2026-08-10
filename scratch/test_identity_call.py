import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-213853066504"

node_cmd = """
const https = require('https');
const options = {
  hostname: 'adminlicencas.coliseusistemas.com.br',
  port: 443,
  path: '/internal/companies/1ca30f62-4487-4103-b529-c6d7b041b245/modules/coliseu-dash/info',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Api-Key': process.env.IDENTITY_INTERNAL_KEY
  }
};

const req = https.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log('BODY:', data); });
});

req.on('error', (e) => { console.error('ERROR:', e); });
req.end();
"""

print("=== TESTING IDENTITY API VIA NODE HTTPS ===")
stdin, stdout, stderr = client.exec_command(f"docker exec {container} node -e \"{node_cmd}\"")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

client.close()
