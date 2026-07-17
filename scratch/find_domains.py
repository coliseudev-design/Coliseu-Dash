import paramiko
import json

def find_domains():
    host = '2.24.82.19'
    user = 'root'
    password = 'Col@13894645'

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password, timeout=10)
        
        # Get list of running container IDs
        stdin, stdout, stderr = client.exec_command("docker ps -q")
        container_ids = stdout.read().decode('utf-8').splitlines()
        
        print(f"Found {len(container_ids)} running containers. Inspecting Traefik rules...")
        
        for cid in container_ids:
            # Get inspect JSON
            stdin, stdout, stderr = client.exec_command(f"docker inspect {cid}")
            inspect_data = stdout.read().decode('utf-8')
            if not inspect_data:
                continue
            
            try:
                data = json.loads(inspect_data)[0]
                name = data.get("Name", "")
                labels = data.get("Config", {}).get("Labels", {})
                
                # Check for Traefik host rule
                rules = []
                for k, v in labels.items():
                    if "traefik.http.routers" in k and ".rule" in k:
                        rules.append(v)
                
                if rules:
                    print(f"Container: {name} ({cid[:12]})")
                    for rule in rules:
                        print(f"  Rule: {rule}")
            except Exception as e:
                print(f"Error parsing inspect data for {cid}: {e}")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    find_domains()
