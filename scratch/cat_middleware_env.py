import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Get container ID dynamically
stdin, stdout, stderr = client.exec_command("docker ps -q --filter name=dashboard-middleware | head -n 1")
container_id = stdout.read().decode('utf-8').strip()

print(f"Container ID: {container_id}")
if container_id:
    # Print the contents of .env in the container if it exists
    stdin, stdout, stderr = client.exec_command(f"docker exec {container_id} cat .env")
    print("=== .env inside container ===")
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))
else:
    print("Container not found.")

client.close()
