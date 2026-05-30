import paramiko
import sys

HOST = '2.24.82.19'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    print("SSH connection succeeded!")
    command = sys.argv[1] if len(sys.argv) > 1 else "uname -a"
    stdin, stdout, stderr = client.exec_command(command)
    print("=== STDOUT ===")
    print(stdout.read().decode('utf-8'))
    print("=== STDERR ===")
    print(stderr.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
finally:
    client.close()
