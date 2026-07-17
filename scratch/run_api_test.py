import paramiko

def run_test():
    host = '2.24.82.19'
    user = 'root'
    password = 'Col@13894645'

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password, timeout=10)
        
        # Node script to run inside container dc6ccbf20a07 (dashboard-middleware)
        node_code = """
const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign(
    {
        sub: '969',
        email: 'kleber@silenus.com',
        tenant: 'db05d98f-6939-4d80-af33-54cd91c35d7f',
        tenantId: 'db05d98f-6939-4d80-af33-54cd91c35d7f',
        module: 'coliseu-dash',
        role: 'admin',
        layoutVersion: 'B.I IA.'
    },
    'aQbY3eqVz2xd8PSr0AUKtfwFRo7n1IickE6sMGWTNCpXhZ95',
    { expiresIn: '1h' }
);

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3200,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log('Querying April 2026...');
        const april = await makeRequest('/api/bi/sales/commercial-kpis?period=custom&start_date=2026-04-01&end_date=2026-04-30');
        console.log('April total faturamento:', april.faturamento_total);

        console.log('Querying May 2026...');
        const may = await makeRequest('/api/bi/sales/commercial-kpis?period=custom&start_date=2026-05-01&end_date=2026-05-31');
        console.log('May total faturamento:', may.faturamento_total);
    } catch(err) {
        console.error('Error:', err);
    }
}

run();
"""
        # Save node script inside container and run it
        # We escape single quotes
        escaped_code = node_code.replace("'", "'\\''")
        cmd = f"docker exec dc6ccbf20a07 node -e '{escaped_code}'"
        
        stdin, stdout, stderr = client.exec_command(cmd)
        print("STDOUT:")
        print(stdout.read().decode('utf-8'))
        print("STDERR:")
        print(stderr.read().decode('utf-8'))
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    run_test()
