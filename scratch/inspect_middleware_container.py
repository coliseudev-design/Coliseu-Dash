import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

container_name = "dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-213853066504"

print("=== Inspecting container ===")
stdin, stdout, stderr = client.exec_command(f"docker inspect {container_name}")
inspect_out = stdout.read().decode('utf-8')
try:
    data = json.loads(inspect_out)
    if data:
        # print port bindings, networks, environment variables
        c = data[0]
        print("State:", c.get("State"))
        print("Config.Env:")
        for env in c.get("Config", {}).get("Env", []):
            if "PASS" not in env and "KEY" not in env and "SECRET" not in env:
                print("  ", env)
        print("NetworkSettings.Ports:", c.get("NetworkSettings", {}).get("Ports"))
        print("NetworkSettings.Networks:")
        for net_name, net in c.get("NetworkSettings", {}).get("Networks", {}).items():
            print(f"  {net_name}: IP={net.get('IPAddress')}, Aliases={net.get('Aliases')}")
except Exception as e:
    print("Error parsing inspect:", e)
    print(inspect_out[:1000])

client.close()
