import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# 1. List users
run_query("USERS IN DATABASE",
          "SELECT id, tenant_id, email, nome, layout_version, role, ativo FROM dash_usuarios")

# 2. List branches (filiais)
run_query("BRANCHES IN DATABASE",
          "SELECT id, tenant_id, depto_id, nome, ativo FROM dash_filiais")
