import paramiko
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "docker ps"

print(f"Running command: {cmd}")
stdin, stdout, stderr = client.exec_command(cmd)
print('STDOUT:')
print(stdout.read().decode('utf-8'))
print('STDERR:')
print(stderr.read().decode('utf-8'))

client.close()
