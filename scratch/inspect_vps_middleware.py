import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    return out, err

# Find middleware container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
container_names = stdout.read().decode('utf-8').strip().split('\n')
container_name = container_names[0] if container_names else None
print(f"Middleware Container Name: {container_name}")

if container_name:
    print("\n=== DOCKER INSPECT (ENV AND PORTS) ===")
    out, err = run_cmd(f"docker inspect {container_name}")
    try:
        data = json.loads(out)[0]
        print("Env vars:")
        for env in data['Config']['Env']:
            print(f"  {env}")
        print("\nExposed Ports:")
        print(data['Config']['ExposedPorts'])
        print("\nPort Bindings:")
        print(data['HostConfig']['PortBindings'])
        print("\nNetwork Ports:")
        print(data['NetworkSettings']['Ports'])
    except Exception as e:
        print("Failed to parse inspect json:", e)
        print(out[:1000])

    print("\n=== SYSTEM LISTENERS ON VPS HOST ===")
    out, err = run_cmd("ss -tulpn")
    print(out)
    
    print("\n=== CHECKING IF THE PROCESS IS RUNNING INSIDE THE CONTAINER ===")
    out, err = run_cmd(f"docker exec {container_name} ps aux")
    print("docker exec ps aux:")
    print(out)
    if err: print("Stderr:", err)

    print("\n=== LAST 50 LINES OF MIDDLEWARE DOCKER LOGS ===")
    out, err = run_cmd(f"docker logs --tail 50 {container_name}")
    print(out)
    if err: print("Stderr logs:", err)

client.close()
