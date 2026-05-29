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

# Count sales in dash_vendas for Vet Seed in Jan 2026
run_query("SELECT COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2026-01-01' AND data_venda <= '2026-01-31'")

# Count items in dash_vendas_itens for Vet Seed in Jan 2026
run_query("SELECT COUNT(*) FROM dash_vendas_itens vi JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id WHERE vi.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND v.data_venda >= '2026-01-01' AND v.data_venda <= '2026-01-31'")

# Check if there are items in dash_vendas_itens with tenant_id at all
run_query("SELECT COUNT(*) FROM dash_vendas_itens WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'")

# Let's inspect some records in dash_vendas_itens to see venda_id_firebird
run_query("SELECT id_firebird, venda_id_firebird, tenant_id FROM dash_vendas_itens WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' LIMIT 5")

client.close()
