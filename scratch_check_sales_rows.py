import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_sql(db, sql):
    cmd = f"docker exec -i vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d {db}"
    stdin, stdout, stderr = client.exec_command(cmd)
    stdin.write(sql)
    stdin.close()
    
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== DB: {db} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# Count rows per tenant
run_sql("coliseu_dashboard", """
SELECT tenant_id, COUNT(*) as vendas_count FROM dash_vendas GROUP BY tenant_id;
SELECT tenant_id, COUNT(*) as itens_count FROM dash_vendas_itens GROUP BY tenant_id;
SELECT tenant_id, COUNT(*) as financeiro_count FROM dash_financeiro GROUP BY tenant_id;
SELECT tenant_id, COUNT(*) as clientes_count FROM dash_clientes GROUP BY tenant_id;
SELECT tenant_id, COUNT(*) as produtos_count FROM dash_produtos GROUP BY tenant_id;
""")

client.close()
