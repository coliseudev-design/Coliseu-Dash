'use strict';

const http = require('http');

const API_HOST = '127.0.0.1';
const API_PORT = 3200;

function post(path, body) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(body);
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log('=== TESTES DE LOGIN DO SUPER USUÁRIO ===\n');

    // Teste 1: Login sem Tenant
    console.log('Teste 1: Tentativa de login sem TenantId...');
    try {
        const res = await post('/api/auth/login', {
            email: 'admin@coliseu.com',
            password: '98683818'
        });

        console.log(`Status: ${res.status}`);
        console.log('Body:', JSON.stringify(res.body, null, 2));

        if (res.status === 200 && res.body.requiresSelection && Array.isArray(res.body.companies)) {
            console.log('✅ TESTE 1 PASSOU: Retornou requiresSelection e a lista de empresas!\n');
            
            const firstCompany = res.body.companies[0];
            if (firstCompany) {
                // Teste 2: Login com Tenant
                console.log(`Teste 2: Tentativa de login selecionando a empresa: ${firstCompany.name} (${firstCompany.id})...`);
                const loginRes = await post('/api/auth/login', {
                    email: 'admin@coliseu.com',
                    password: '98683818',
                    selectedTenantId: firstCompany.id
                });

                console.log(`Status: ${loginRes.status}`);
                console.log('Body:', JSON.stringify(loginRes.body, null, 2));

                if (loginRes.status === 200 && loginRes.body.token && loginRes.body.user && loginRes.body.user.role === 'master') {
                    console.log('✅ TESTE 2 PASSOU: Login concluído com sucesso e perfil master retornado!\n');
                } else {
                    console.log('❌ TESTE 2 FALHOU!\n');
                }
            } else {
                console.log('⚠️ Sem empresas cadastradas no Identity para prosseguir com o Teste 2.\n');
            }
        } else {
            console.log('❌ TESTE 1 FALHOU!\n');
        }
    } catch (err) {
        console.error('Erro no Teste 1/2:', err);
    }

    // Teste 3: Senha incorreta
    console.log('Teste 3: Tentativa de login com senha incorreta...');
    try {
        const res = await post('/api/auth/login', {
            email: 'admin@coliseu.com',
            password: 'senha_errada'
        });

        console.log(`Status: ${res.status}`);
        console.log('Body:', JSON.stringify(res.body, null, 2));

        if (res.status === 401) {
            console.log('✅ TESTE 3 PASSOU: Login bloqueado por senha incorreta!\n');
        } else {
            console.log('❌ TESTE 3 FALHOU!\n');
        }
    } catch (err) {
        console.error('Erro no Teste 3:', err);
    }
}

runTests();
