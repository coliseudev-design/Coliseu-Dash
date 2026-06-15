import paramiko

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to Prod VPS")

        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        print(f"Container: {container_name}")

        js_code = """
async function test() {
  const loginUrl = 'http://localhost:3200/api/auth/login';
  const meUrl = 'http://localhost:3200/api/auth/me';
  
  console.log('\\n--- Efetuando login para obter Token ---');
  try {
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste@compensado.com.br', password: 'password123' })
    });
    const loginData = await res.json();
    const token = loginData.token;
    console.log('Login bem-sucedido! Token obtido.');

    console.log('\\n--- Testando Endpoint /me com Token ---');
    const resMe = await fetch(meUrl, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Status /me:', resMe.status);
    const meData = await resMe.json();
    console.log('JSON /me Response:', JSON.stringify(meData, null, 2));
  } catch (e) {
    console.error('Erro no teste:', e.message);
  }
}

test();
"""
        # Execute node inside the container and pipe the script via stdin
        cmd = f"docker exec -i {container_name} node"
        stdin, stdout, stderr = client.exec_command(cmd)
        stdin.write(js_code)
        stdin.close()
        
        print("Test Output:")
        print(stdout.read().decode('utf-8'))
        print("Errors:")
        print(stderr.read().decode('utf-8'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
