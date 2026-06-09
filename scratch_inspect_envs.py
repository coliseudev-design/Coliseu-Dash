import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def inspect_container_env(container_name):
    cmd = f"docker inspect {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if not out:
        print(f"=== Error inspecting {container_name}: {err} ===")
        return
    
    try:
        data = json.loads(out)
        env = data[0]['Config']['Env']
        print(f"=== Env for {container_name} ===")
        for e in env:
            # Mask sensitive tokens, but print names and database-related fields
            if any(k in e.lower() for k in ['password', 'secret', 'key', 'token']):
                parts = e.split('=', 1)
                if len(parts) == 2:
                    print(f"{parts[0]}=********")
                else:
                    print(e)
            else:
                print(e)
    except Exception as ex:
        print(f"Error parsing json for {container_name}: {ex}")

inspect_container_env("dashboard-middleware-g115wwb76cltjli9wew0cgfi-125244749473")
inspect_container_env("middleware-oqyafcbt0l2r7fit91zbev6h-134026462742")
inspect_container_env("identity-oqyafcbt0l2r7fit91zbev6h-134026443681")
inspect_container_env("api-szm3mlq03szb6v2mikkq5aqk-130506971768")
inspect_container_env("nexus-middleware-br0y0d05a1fq8fpwppb3y5bb-135959644570")
inspect_container_env("siscom-middleware-beu06p1qif1yllvfbjphk3ov-135931106591")

client.close()
