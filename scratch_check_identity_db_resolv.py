import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== {cmd} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# Check /etc/hosts in identity container
run_cmd("docker exec identity-oqyafcbt0l2r7fit91zbev6h-134026443681 cat /etc/hosts")

# Check ping or host resolution
run_cmd("docker exec identity-oqyafcbt0l2r7fit91zbev6h-134026443681 getent hosts vasjsucz4yxcb7m4rtqindd2")

client.close()
