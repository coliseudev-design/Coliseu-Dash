import paramiko
import json

host = '177.39.17.7'
user = 'root'
password = '6EFBC!c0:wzr%Ij'
container = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

sql = "SELECT row_to_json(r) FROM (SELECT * FROM companies WHERE \\\"Id\\\" = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5') r;"
cmd = f"docker exec {container} psql -U coliseu_admin -d coliseu_identity -t -c \"{sql}\""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, username=user, password=password)
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    if err:
        print("ERR:", err)
    if out:
        data = json.loads(out)
        print("=== Company Piveta Dist ===")
        for k, v in data.items():
            print(f"{k}: {v}")
    else:
        print("No row found.")
except Exception as e:
    print("Error:", e)
finally:
    client.close()
