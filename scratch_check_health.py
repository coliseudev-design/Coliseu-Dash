import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def check_health():
    # Find container name dynamically
    stdin, stdout, stderr = client.exec_command("docker ps -a --format '{{.Names}}' | grep 'dashboard-middleware'")
    container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
    if not container_name:
        print("Error: dashboard-middleware container not found!")
        return
        
    cmd = f"docker inspect {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    try:
        data = json.loads(out)
        health = data[0].get('State', {}).get('Health', {})
        print(f"=== Health Check for {container_name} ===")
        print(json.dumps(health, indent=2))
    except Exception as ex:
        print("Error inspecting health:", ex)

check_health()
client.close()
