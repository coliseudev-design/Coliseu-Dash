import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS)
    # Find container name matching dashboard-middleware
    _, stdout, _ = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip()
    print(f"Container Name: {container_name}")
    
    if container_name:
        # Inspect env variables
        _, stdout, _ = client.exec_command(f"docker inspect {container_name} --format '{{{{range .Config.Env}}}}{{{{.}}}}\\n{{{{end}}}}'")
        envs = stdout.read().decode('utf-8').strip()
        print("\n=== ENVIRONMENT VARIABLES ===")
        print(envs)
    else:
        print("Middleware container not running!")
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
