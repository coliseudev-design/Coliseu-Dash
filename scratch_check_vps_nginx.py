import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {cmd} ===")
    print(stdout.read().decode('utf-8'))

run_cmd("find / -name '*nginx*.conf' -o -name '*traefik*.yaml' -o -name '*caddyfile*' 2>/dev/null | grep -v '/var/lib/docker'")
run_cmd("find /data -type f 2>/dev/null | xargs grep -l 'dashboard.coliseusistemas.com.br' 2>/dev/null")
client.close()
