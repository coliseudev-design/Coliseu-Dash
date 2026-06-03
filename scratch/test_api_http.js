const jwt = require('jsonwebtoken');
const config = require('./src/config/env');

async function testHTTP(email, userId, tenantId, label) {
    const token = jwt.sign(
        {
            sub: userId,
            email: email,
            tenant: tenantId,
            tenantId: tenantId,
            module: config.security.expectedModuleSlug,
            companyName: 'Test Company',
            role: 'admin',
            layoutVersion: 'v1.0'
        },
        config.security.jwtDeviceKey,
        { expiresIn: '1h' }
    );

    const url = `http://localhost:3200/api/estatisticas/overview?period=last12m`;
    try {
        const resp = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(`\n=== HTTP RESPONSE FOR ${label} ===`);
        console.log(`Status:`, resp.status);
        const json = await resp.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (err) {
        console.error(`HTTP error for ${label}:`, err.message);
    }
}

async function main() {
    // 1. Silenus
    await testHTTP('kleber@silenus.com.br', 247, 'a822a7e7-fdd4-4483-bbb5-26587a72739f', 'SILENUS');
    // 2. Empresa Cliente
    await testHTTP('cliente@teste.com.br', 13, 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5', 'EMPRESA CLIENTE');
}
main();
