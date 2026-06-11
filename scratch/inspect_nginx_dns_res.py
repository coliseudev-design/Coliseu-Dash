import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Find frontend container
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep dashboard-frontend")
frontend_container = stdout.read().decode('utf-8').strip()

print(f"Frontend container: '{frontend_container}'")

if frontend_container:
    # Resolve dashboard-middleware
    cmd = f"docker exec {frontend_container} ping -c 2 dashboard-middleware"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("=== PING dashboard-middleware ===")
    print("STDOUT:", stdout.read().decode('utf-8'))
    print("STDERR:", stderr.read().decode('utf-8'))
    
    # Try resolving via getent
    cmd_getent = f"docker exec {frontend_container} getent hosts dashboard-middleware"
    stdin, stdout, stderr = client.exec_command(cmd_getent)
    print("=== GETENT hosts ===")
    print("STDOUT:", stdout.read().decode('utf-8'))
    print("STDERR:", stderr.read().decode('utf-8'))
    
    # Check current /etc/hosts of the container
    cmd_hosts = f"docker exec {frontend_container} cat /etc/hosts"
    stdin, stdout, stderr = client.exec_command(cmd_hosts)
    print("=== /etc/hosts ===")
    print(stdout.read().decode('utf-8'))
    
    # Check /etc/resolv.conf
    cmd_resolv = f"docker exec {frontend_container} cat /etc/resolv.conf"
    stdin, stdout, stderr = client.exec_command(cmd_resolv)
    print("=== /etc/resolv.conf ===")
    print(stdout.read().decode('utf-8'))
else:
    print("Frontend container not found.")

client.close()
