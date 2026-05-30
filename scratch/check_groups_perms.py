import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== DB: {db} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

print("--- GRUPOS DE ACESSO ---")
run_query("SELECT id, tenant_id, layout_version, nome FROM dash_grupos_acesso")

print("--- PERMISSÕES DO GRUPO ADMINISTRADOR NO LAYOUT v4.0 ---")
run_query("""
    SELECT p.id, g.nome as grupo, g.layout_version, p.recurso, p.pode_acessar 
    FROM dash_permissoes p 
    JOIN dash_grupos_acesso g ON p.grupo_id = g.id 
    WHERE g.layout_version = 'v4.0' AND g.nome = 'Administrador'
""")

client.close()
