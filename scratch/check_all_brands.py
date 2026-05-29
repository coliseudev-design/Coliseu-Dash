import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

print("=== SEARCH FOR ZOETIS ===")
run_query("SELECT tenant_id, marca, COUNT(*) FROM dash_vendas_itens WHERE UPPER(marca) LIKE '%ZOETIS%' GROUP BY 1, 2;")

print("=== SEARCH FOR BRAVET ===")
run_query("SELECT tenant_id, marca, COUNT(*) FROM dash_vendas_itens WHERE UPPER(marca) LIKE '%BRAVET%' GROUP BY 1, 2;")

client.close()
