import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== Query: {sql[:150]} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err.strip():
        print("ERR:", err)

# Check distinct marcas in dash_vendas_itens for Vet Seed
run_query("SELECT marca, COUNT(*) FROM dash_vendas_itens WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' GROUP BY marca LIMIT 20")

# Check distinct categorias in dash_vendas_itens for Vet Seed
run_query("SELECT categoria, COUNT(*) FROM dash_vendas_itens WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' GROUP BY categoria LIMIT 20")

# Check if there are any marcas/categorias in dash_vendas instead
run_query("SELECT marca, categoria, COUNT(*) FROM dash_vendas WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' GROUP BY marca, categoria LIMIT 20")

client.close()
