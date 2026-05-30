const jwt = require('jsonwebtoken');
const http = require('http');

const jwtSecret = "aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95";
const tenantId = "a822a7e7-fdd4-4483-bbb5-26587a72739f";
const userId = 250; // coliseudev@gmail.com

function makeRequest(token, path) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3200,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    path,
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });
        
        req.on('error', (err) => {
            resolve({
                path,
                statusCode: 500,
                body: err.message
            });
        });
        
        req.end();
    });
}

(async () => {
    const versions = ['v1.0', 'v4.0'];
    const paths = [
        '/api/sync/status',
        '/api/filiais',
        '/api/estatisticas/kpis?period=last12m&depto_id=1',
        '/api/ranking/marcas?period=last12m&depto_id=1',
        '/api/estatisticas/overview?period=last12m&depto_id=1'
    ];
    
    for (const ver of versions) {
        console.log(`\n=================== TESTING VERSION ${ver} ===================`);
        const token = jwt.sign({
            tenantId: tenantId,
            module: 'coliseu-dash',
            userId: userId,
            layoutVersion: ver
        }, jwtSecret, { expiresIn: '1h' });

        for (const p of paths) {
            console.log(`\nCalling ${p}...`);
            const result = await makeRequest(token, p);
            console.log(`Status: ${result.statusCode}`);
            try {
                const parsed = JSON.parse(result.body);
                if (result.statusCode !== 200) {
                    console.log("Error Body:", parsed);
                } else {
                    console.log("Success (keys):", Object.keys(parsed));
                }
            } catch {
                console.log("Raw Body:", result.body.substring(0, 500));
            }
        }
    }
    
    process.exit(0);
})();
