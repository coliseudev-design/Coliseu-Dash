import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_json_query(sql, db="coliseu_identity"):
    sql_wrapped = f"SELECT json_agg(t) FROM ({sql}) t;"
    sql_escaped = sql_wrapped.replace('"', '\\"')
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -t -A -c "{sql_escaped}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    if err:
        print(f"Error: {err}")
        return None
    if out:
        try:
            return json.loads(out)
        except Exception as e:
            print(f"Failed to parse JSON: {e}")
            return None
    return None

companies = run_json_query('SELECT "Id", "Name" FROM companies')
print("=== Companies ===")
print(json.dumps(companies, indent=2, default=str))

client.close()
