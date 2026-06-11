import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    print("Successfully connected to 2.24.82.19")
except Exception as e:
    print("Failed to connect to 2.24.82.19:", e)
    try:
        client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij', timeout=10)
        print("Successfully connected to 177.39.17.7")
    except Exception as e2:
        print("Failed to connect to 177.39.17.7:", e2)
        exit(1)

def run_cmd(cmd):
    print(f"\n--- Running: {cmd} ---")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out:
        print("STDOUT:")
        print(out)
    if err:
        print("STDERR:")
        print(err)
    return out, err

run_cmd("docker ps -a")

# Find the middleware container name
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
container_names = stdout.read().decode('utf-8').strip().split('\n')
container_name = container_names[0] if container_names and container_names[0] else None
print(f"Detected middleware container: {container_name}")

if container_name:
    # Check container detailed state and health
    run_cmd(f"docker inspect {container_name} --format 'Status: {{{{.State.Status}}}} | Healthy: {{{{json .State.Health.Status}}}}'")
    
    # Check healthcheck details
    run_cmd(f"docker inspect {container_name} --format 'Health Log: {{{{json .State.Health}}}}'")
    
    # Run curl inside the server to see if the port 3200 is responding
    run_cmd(f"docker exec {container_name} wget -qO- http://localhost:3200/health/liveness || true")
    run_cmd(f"curl -i http://localhost:3200/health/liveness")
    
    # Get last 50 lines of logs from container
    run_cmd(f"docker logs --tail 50 {container_name}")
else:
    print("No middleware container running.")

client.close()
