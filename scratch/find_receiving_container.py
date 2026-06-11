import paramiko
import urllib.request
import json
import time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

# Find containers
dashboard_frontend = run_cmd("docker ps --format '{{.Names}}' | grep dashboard-frontend")
other_frontend = "frontend-nsnopymisrq9qphl5qjc3w5l-130259280785"

print(f"dashboard-frontend container: '{dashboard_frontend}'")
print(f"other-frontend container: '{other_frontend}'")

# Get log count before
def get_log_line_count(container):
    lines = run_cmd(f"docker logs --tail 5 {container}")
    return lines

print("\n--- BEFORE REQUEST ---")
print(f"[{dashboard_frontend}] logs (last 3):")
print(get_log_line_count(dashboard_frontend))
print(f"\n[{other_frontend}] logs (last 3):")
print(get_log_line_count(other_frontend))

# Trigger request
print("\nTriggering request...")
try:
    req = urllib.request.Request(
        'https://dashboard.coliseusistemas.com.br/api/auth/login',
        data=json.dumps({"email": "teste@coliseu.com", "password": "123456"}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        print("Response Code:", response.getcode())
except Exception as e:
    print("Request result:", e)

time.sleep(1)

print("\n--- AFTER REQUEST ---")
print(f"[{dashboard_frontend}] logs (last 5):")
print(get_log_line_count(dashboard_frontend))
print(f"\n[{other_frontend}] logs (last 5):")
print(get_log_line_count(other_frontend))

client.close()
