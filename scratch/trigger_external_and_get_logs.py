import paramiko
import time
import urllib.request
import json

# 1. Trigger the external request (ignore HTTPS/SSL verification issues if any, but standard urllib handles it)
print("Triggering external request...")
try:
    req = urllib.request.Request(
        'https://dashboard.coliseusistemas.com.br/api/auth/login',
        data=json.dumps({"email": "teste@coliseu.com", "password": "123456"}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        print("Response Code:", response.getcode())
except Exception as e:
    print("External request error (expected 502):", e)

# 2. Get the frontend container name and logs
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-frontend")
frontend_container = stdout.read().decode('utf-8').strip()

print(f"Frontend container: '{frontend_container}'")

if frontend_container:
    # Print the last 15 lines of docker logs (stdout and stderr)
    stdin, stdout, stderr = client.exec_command(f"docker logs --tail 15 {frontend_container}")
    print("=== DOCKER LOGS STDOUT ===")
    print(stdout.read().decode('utf-8'))
    print("=== DOCKER LOGS STDERR ===")
    print(stderr.read().decode('utf-8'))

client.close()
