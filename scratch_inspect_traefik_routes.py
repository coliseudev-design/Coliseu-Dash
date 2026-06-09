import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8').strip()

containers_raw = run_cmd("docker ps --format '{{.Names}}'")
containers = containers_raw.splitlines()

for name in containers:
    print(f"\n========================================\nLABELS FOR CONTAINER: {name}\n========================================")
    labels = run_cmd(f"docker inspect {name} --format '{{{{json .Config.Labels}}}}'")
    import json
    try:
        lbl_dict = json.loads(labels)
        # Filter only traefik labels
        traefik_lbls = {k: v for k, v in lbl_dict.items() if 'traefik' in k}
        for k, v in traefik_lbls.items():
            print(f"  {k}: {v}")
    except Exception as e:
        print("  Error parsing labels:", e)

client.close()
