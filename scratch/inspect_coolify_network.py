import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command('docker network inspect coolify')
network_data = json.loads(stdout.read().decode('utf-8'))

for container_id, container_info in network_data[0]['Containers'].items():
    print(f"Container: {container_info['Name']}")
    print(f"  IP: {container_info['IPv4Address']}")
    print(f"  Aliases: {container_info.get('Aliases', 'N/A')}")

client.close()
