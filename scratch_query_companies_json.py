import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_json_query(db, query_str):
    # Wrap subquery in json_agg to get a clean JSON output
    sql = f"SELECT json_agg(t) FROM ({query_str}) t;"
    # Double escape backslashes and quotes for the shell command
    escaped_sql = sql.replace('"', '\\"')
    cmd = f"docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d {db} -t -c \"{escaped_sql}\""
    
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    
    if err:
        print("ERR:", err)
        return None
    
    if not out:
        print("No output received")
        return None
        
    try:
        data = json.loads(out)
        return data
    except Exception as e:
        print("Failed to parse JSON:", e)
        print("Output was:", out)
        return None

print("=== COMPANIES ===")
companies = run_json_query("coliseu_identity", "SELECT \\\"Id\\\", \\\"Name\\\", \\\"Status\\\" FROM companies")
if companies:
    for c in companies:
        print(c)

print("\n=== COMPANY MODULES ===")
modules = run_json_query("coliseu_identity", "SELECT \\\"Id\\\", \\\"CompanyId\\\", \\\"ModuleSlug\\\", \\\"IsActive\\\" FROM company_modules")
if modules:
    for m in modules:
        print(m)

client.close()
