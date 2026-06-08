import paramiko
import os

HOST     = '177.39.17.7'
USER     = 'root'
PASSWORD = '6EFBC!c0:wzr%Ij'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to VPS")

        # Discover active container name dynamically
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        if not container_name:
            print("Error: middleware container not found!")
            return
        print(f"Container: {container_name}")

        # Write local temp query script
        js_code = """
const config = require('./src/config/env');

async function query() {
  const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;
  console.log('Identity API URL:', identityApiUrl);
  
  const tenants = [
    'a822a7e7-fdd4-4483-bbb5-26587a72739f',
    '816f97c4-66fb-4ef8-905d-e0551cbf2492',
    'ed1d3a98-4c4d-48db-99c0-8751926eb8e5'
  ];

  for (const tenantId of tenants) {
    const url = `${identityApiUrl}/internal/companies/${tenantId}/modules/${expectedModuleSlug}/info`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key': identityInternalKey
        }
      });
      if (response.status === 200) {
        const data = await response.json();
        console.log(`Tenant: ${tenantId} -> Name: ${data.nomeDaEmpresa}`);
      } else {
        console.log(`Tenant: ${tenantId} -> Status: ${response.status}`);
      }
    } catch (e) {
      console.error(`Tenant: ${tenantId} -> Error: ${e.message}`);
    }
  }
}

query();
"""
        local_path = "scratch/temp_query_identity.js"
        with open(local_path, "w", encoding="utf-8") as f:
            f.write(js_code)
        
        # Upload JS to VPS
        sftp = client.open_sftp()
        sftp.put(local_path, "/tmp/query_identity.js")
        sftp.close()

        # Copy to container and run
        client.exec_command(f"docker cp /tmp/query_identity.js {container_name}:/usr/src/app/query_identity.js")
        stdin, stdout, stderr = client.exec_command(f"docker exec -w /usr/src/app {container_name} node query_identity.js")
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        if out:
            print("OUTPUT:")
            print(out)
        if err:
            print("ERROR:")
            print(err)

        # Cleanup
        client.exec_command(f"docker exec {container_name} rm /usr/src/app/query_identity.js")
        client.exec_command("rm /tmp/query_identity.js")
        if os.path.exists(local_path):
            os.remove(local_path)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
