import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def print_env(path):
    print(f"=== {path} ===")
    stdin, stdout, stderr = client.exec_command(f"cat {path}")
    for line in stdout.read().decode('utf-8').split('\n'):
        if '=' in line:
            k, v = line.split('=', 1)
            if any(sec in k.upper() for sec in ['PASSWORD', 'SECRET', 'KEY', 'JWT', 'TOKEN', 'PASS']):
                print(f"  {k}=******")
            else:
                print(f"  {k}={v}")
        else:
            print(f"  {line}")

print_env("/data/coolify/applications/nsnopymisrq9qphl5qjc3w5l/.env")
print_env("/data/coolify/applications/x8er9vfeted415kxxqpnlkse/.env")
print_env("/data/coolify/applications/bqc1xkwidahlyju489u3gxnq/.env")

client.close()
