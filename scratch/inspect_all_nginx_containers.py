import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

print("=== NGINX CONTAINERS ===")
containers = run_cmd("docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}'").splitlines()
for c in containers:
    name, image, status = c.split('\t')
    # Check if container runs nginx
    has_nginx = run_cmd(f"docker exec {name} which nginx 2>/dev/null")
    if has_nginx:
        print(f"Container: {name}")
        print(f"  Image: {image}")
        print(f"  Status: {status}")
        # Get nginx version
        ver = run_cmd(f"docker exec {name} nginx -v 2>&1")
        print(f"  Nginx Version: {ver}")

client.close()
