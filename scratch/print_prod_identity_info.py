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
const url = 'https://adminlicencas.coliseusistemas.com.br/internal/companies/ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6/modules/coliseu-dash/info';
const key = 'Coliseu2026!IdentitySuperSecretKeyOauth20';

async function fetchInfo() {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Key': key
      }
    });
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('JSON:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

fetchInfo();
"""
        # Execute node inside the container and pipe the script via stdin
        cmd = f"docker exec -i {container_name} node"
        stdin, stdout, stderr = client.exec_command(cmd)
        stdin.write(js_code)
        stdin.close() # Close stdin to let node run the script to completion
        
        print("Response from Identity API:")
        print(stdout.read().decode('utf-8'))
        print("Errors:")
        print(stderr.read().decode('utf-8'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
