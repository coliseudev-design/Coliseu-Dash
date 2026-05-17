import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB = "coolify-db"

def pg(sql, label):
    cmd = f'docker exec {DB} psql -U coliseu_admin -d coliseu_dashboard -t -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    out = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    if out: print(out)
    if err: print("ERR:", err)

# Find tenant ID
pg("SELECT id FROM dash_tenants LIMIT 1;", "Tenant ID")

# Sum vendas for May 1 to May 5
sql1 = """
SELECT 
    SUM(valor_total) as sum_total,
    SUM(valor_custo) as sum_custo,
    SUM(valor_desconto) as sum_desc
FROM dash_vendas 
WHERE data_venda >= '2026-05-01 00:00:00' 
  AND data_venda <= '2026-05-05 23:59:59'
  AND UPPER(TRIM(status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO');
"""
pg(sql1.replace('\n', ' '), "Sum Vendas (NOT IN ...)")

sql2 = """
SELECT 
    SUM(valor_total) as sum_total
FROM dash_vendas 
WHERE data_venda >= '2026-05-01 00:00:00' 
  AND data_venda <= '2026-05-05 23:59:59';
"""
pg(sql2.replace('\n', ' '), "Sum Vendas (ALL STATUS)")

sql3 = """
SELECT status, COUNT(*), SUM(valor_total)
FROM dash_vendas 
WHERE data_venda >= '2026-05-01 00:00:00' 
  AND data_venda <= '2026-05-05 23:59:59'
GROUP BY status;
"""
pg(sql3.replace('\n', ' '), "Vendas by Status")

client.close()
