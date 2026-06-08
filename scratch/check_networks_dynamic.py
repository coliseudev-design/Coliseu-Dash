import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --filter 'name=dashboard-middleware' --format '{{.Names}}'")
container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
print(f"Middleware Container: {container_name}")

if container_name:
    stdin, stdout, stderr = client.exec_command(f"docker inspect {container_name} --format '{{{{json .NetworkSettings.Networks}}}}'")
    nets = json.loads(stdout.read().decode('utf-8'))
    for net_name, net_info in nets.items():
        print(f"  Network: {net_name}")
        print(f"  IP: {net_info.get('IPAddress')}")
        print(f"  Gateway: {net_info.get('Gateway')}")
        
        # inspect network
        stdin2, stdout2, stderr2 = client.exec_command(f"docker network inspect {net_name} --format '{{{{json .Containers}}}}'")
        print(f"=== Containers in network {net_name} ===")
        try:
            containers = json.loads(stdout2.read().decode('utf-8'))
            for c_id, c_info in containers.items():
                print(f"  {c_info.get('Name')} -> {c_info.get('IPv4Address')}")
        except Exception as e:
            print("  Error parsing containers:", e)

client.close()
