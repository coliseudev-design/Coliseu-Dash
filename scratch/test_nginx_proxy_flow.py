import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find frontend container
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-frontend")
frontend_container = stdout.read().decode('utf-8').strip()

print(f"Frontend container: '{frontend_container}'")

if frontend_container:
    # 1. Curl the login API endpoint from inside the frontend container itself (using localhost)
    cmd_curl = f"docker exec {frontend_container} curl -i -X POST -H 'Content-Type: application/json' -d '{{\"email\":\"teste@coliseu.com\",\"password\":\"123456\"}}' http://localhost/api/auth/login"
    stdin, stdout, stderr = client.exec_command(cmd_curl)
    print("=== CURL FROM INSIDE FRONTEND ===")
    print("STDOUT:")
    print(stdout.read().decode('utf-8', errors='replace'))
    print("STDERR:")
    print(stderr.read().decode('utf-8', errors='replace'))

    # 2. Get Nginx docker logs immediately after
    stdin, stdout, stderr = client.exec_command(f"docker logs --tail 20 {frontend_container}")
    print("=== FRONTEND CONTAINER LOGS ===")
    print("STDOUT:")
    print(stdout.read().decode('utf-8', errors='replace'))
    print("STDERR:")
    print(stderr.read().decode('utf-8', errors='replace'))

client.close()
