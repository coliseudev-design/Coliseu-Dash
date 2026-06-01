import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
MIDDLEWARE_CONTAINER = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-061236536325"

# Node script content
node_script = """
const jwt = require('jsonwebtoken');
const secret = 'aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95';
const token = jwt.sign({
    sub: 999,
    email: 'thiago@vet.com.br',
    tenant: 'a822a7e7-fdd4-4483-bbb5-26587a72739f',
    tenantId: 'a822a7e7-fdd4-4483-bbb5-26587a72739f',
    module: 'coliseu-dash',
    companyName: 'Siscom Vet',
    role: 'admin',
    layoutVersion: 'v4.0'
}, secret, { expiresIn: '1h' });

fetch('http://localhost:3200/api/bi/sales/executive-summary?period=lastMonth', {
    headers: { 'Authorization': 'Bearer ' + token }
})
.then(res => res.json().then(data => ({ status: res.status, data })))
.then(res => console.log(JSON.stringify(res, null, 2)))
.catch(err => console.error(err));
"""

# Write node script inside container and run it
node_script_escaped = node_script.replace('"', '\\"').replace('`', '\\`').replace('$', '\\$')
cmd = f'docker exec {MIDDLEWARE_CONTAINER} node -e "{node_script_escaped}"'
stdin, stdout, stderr = client.exec_command(cmd)

print("=== API TEST RESPONSE ===")
print(stdout.read().decode('utf-8'))
print("=== API TEST ERRORS ===")
print(stderr.read().decode('utf-8'))

client.close()
