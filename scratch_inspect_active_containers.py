import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

containers_raw = run_cmd("docker ps --format '{{.Names}}'")
containers = containers_raw.splitlines()

for name in containers:
    if any(x in name for x in ['api', 'frontend', 'dashboard', 'middleware', 'coliseu-db']):
        print(f"\n========================================\nINSPECTING CONTAINER: {name}\n========================================")
        env = run_cmd(f"docker inspect {name} --format '{{{{range .Config.Env}}}}{{{{.}}}}\\n{{{{end}}}}'")
        print("ENV:")
        print(env)
        
        ports = run_cmd(f"docker inspect {name} --format '{{{{.HostConfig.PortBindings}}}}'")
        print("PORT BINDINGS:")
        print(ports)

client.close()
