import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_query(label, sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d {db} -c "{sql_escaped}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"\n=== {label} ===")
    print(out)
    if err.strip():
        print("ERR:", err)

# 1. Sum of valor_total and valor_desconto in June 2026
run_query(
    "Sum of total, discount and net in June 2026",
    """SELECT COUNT(*), SUM(valor_total) as bruto, SUM(valor_desconto) as desconto, SUM(valor_total - valor_desconto) as liquido 
       FROM dash_vendas 
       WHERE tenant_id = '816f97c4-66fb-4ef8-905d-e0551cbf2942' 
         AND data_venda >= '2026-06-01' AND data_venda <= '2026-06-10';"""
)





# 2. Sum using COALESCE(data_vencimento, data_venda)
run_query(
    "Sum using COALESCE(data_vencimento, data_venda)",
    """SELECT COUNT(*), SUM(valor_total) 
       FROM dash_vendas 
       WHERE tenant_id = '816f97c4-66fb-4ef8-905d-e0551cbf2942' 
         AND COALESCE(data_vencimento, data_venda) >= '2026-06-01' 
         AND COALESCE(data_vencimento, data_venda) <= '2026-06-10';"""
)






client.close()
