import paramiko

HOST = '38.242.244.84'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'psql -U coliseu_user -d coliseu_db -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS, timeout=10)
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

run_query("USERS FROM COLISU_DB", "SELECT id, email, nome, layout_version, use_vet_db FROM dash_usuarios")
