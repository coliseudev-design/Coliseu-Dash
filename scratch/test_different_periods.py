import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MIDDLEWARE_CONTAINER = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-145439028228"

js_code = """
const jwt = require('jsonwebtoken');
const config = require('./src/config/env');

async function testHTTP(endpoint, period, label) {
    const token = jwt.sign(
        {
            sub: 247,
            email: 'kleber@silenus.com.br',
            tenant: 'a822a7e7-fdd4-4483-bbb5-26587a72739f',
            tenantId: 'a822a7e7-fdd4-4483-bbb5-26587a72739f',
            module: config.security.expectedModuleSlug,
            companyName: 'Test Company',
            role: 'admin',
            layoutVersion: 'v1.0'
        },
        config.security.jwtDeviceKey,
        { expiresIn: '1h' }
    );

    const url = `http://localhost:3200/api${endpoint}?period=${period}`;
    try {
        const resp = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(`\\n=== HTTP RESPONSE FOR ${endpoint} period=${period} ===`);
        console.log(`Status:`, resp.status);
        const json = await resp.json();
        if (endpoint.includes('overview')) {
            console.log("Hoje:", json.hoje);
            console.log("Mês:", json.mes);
            console.log("Anterior:", json.anterior);
        } else if (endpoint.includes('kpis')) {
            console.log("Vendas:", json.vendas);
            console.log("Financeiro:", json.financeiro);
        } else {
            console.log(JSON.stringify(json).substring(0, 200));
        }
    } catch (err) {
        console.error(`HTTP error for ${endpoint} ${period}:`, err.message);
    }
}

async function main() {
    await testHTTP('/estatisticas/overview', 'thisMonth', 'OVERVIEW_THIS_MONTH');
    await testHTTP('/estatisticas/overview', 'last12m', 'OVERVIEW_LAST_12M');
    await testHTTP('/estatisticas/kpis', 'thisMonth', 'KPIS_THIS_MONTH');
    await testHTTP('/estatisticas/kpis', 'last12m', 'KPIS_LAST_12M');
}
main();
"""

# Write and run in container as root
stdin, stdout, stderr = client.exec_command(f"docker exec -u root -i {MIDDLEWARE_CONTAINER} tee /usr/src/app/test_periods.js > /dev/null")
stdin.write(js_code)
stdin.close()
stdout.read()

stdin, stdout, stderr = client.exec_command(f"docker exec -u root -w /usr/src/app {MIDDLEWARE_CONTAINER} node test_periods.js")
print("=== STDOUT ===")
print(stdout.read().decode('utf-8'))
print("=== STDERR ===")
print(stderr.read().decode('utf-8'))

client.close()
