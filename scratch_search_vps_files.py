import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    
    # Find any files containing 'sync' or 'worker' in their name
    cmd = "find / -name '*sync*.log' -o -name '*worker*.log' -o -name '*sync*.conf' 2>/dev/null | grep -v '/proc/' | grep -v '/sys/' | tail -n 50"
    _, stdout, _ = client.exec_command(cmd)
    print("=== VPS LOG/CONF FILES ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()
