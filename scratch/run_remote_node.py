import paramiko
import sys

if len(sys.argv) < 3:
    print("Usage: python3 run_remote_node.py <container_name> <local_file_path>")
    sys.exit(1)

container_name = sys.argv[1]
local_file_path = sys.argv[2]

with open(local_file_path, 'r', encoding='utf-8') as f:
    code = f.read()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Execute node inside container, reading from stdin
command = f"docker exec -i {container_name} node"
stdin, stdout, stderr = client.exec_command(command)

# Write the code to stdin and close it
stdin.write(code)
stdin.flush()
stdin.channel.shutdown_write()

print('=== STDOUT ===')
print(stdout.read().decode('utf-8'))
print('=== STDERR ===')
print(stderr.read().decode('utf-8'))
client.close()
