import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {CONTAINER} psql -U coliseu_admin -d {db} -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# 1. Listar colunas de companies
run_query(
    "COLUNAS DE companies",
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'companies'",
    db="coliseu_identity"
)

# 2. Listar todas as empresas no coliseu_identity
run_query(
    "TODAS AS EMPRESAS (coliseu_identity)",
    "SELECT * FROM companies",
    db="coliseu_identity"
)

# 3. Listar todos os usuarios no coliseu_identity
run_query(
    "TODAS OS USUARIOS (coliseu_identity)",
    "SELECT * FROM admin_users",
    db="coliseu_identity"
)
