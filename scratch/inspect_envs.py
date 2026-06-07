import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get the container ID of the running dashboard-middleware
stdin, stdout, stderr = client.exec_command("docker ps -q --filter name=dashboard-middleware | head -n 1")
container_id = stdout.read().decode('utf-8').strip()

print(f"Active middleware container ID: {container_id}")

if container_id:
    stdin, stdout, stderr = client.exec_command(f"docker exec {container_id} env | grep -i PG_")
    print("=== Postgres Env Vars ===")
    print(stdout.read().decode('utf-8'))
    
    stdin, stdout, stderr = client.exec_command(f"docker exec {container_id} env | grep -i tenant")
    print("=== Tenant Env Vars ===")
    print(stdout.read().decode('utf-8'))
else:
    print("No active dashboard-middleware container found.")

client.close()
