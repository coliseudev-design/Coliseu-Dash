const fetch = require('node-fetch');
async function run() {
    const url = 'https://adminlicencas.coliseusistemas.com.br/internal/companies/c06a45f5-0000-0000-0000-000000000000/branches';
    const key = 'Coliseu2026!IdentitySuperSecretKeyOauth20';
    try {
        const res = await fetch(url, { headers: { 'x-internal-api-key': key } });
        console.log(res.status, await res.text());
    } catch(e) { console.error(e); }
}
run();
