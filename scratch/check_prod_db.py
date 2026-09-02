"""
Conectar ao servidor de banco de dados via SSH e consultar dash_vendas_itens da Amazônia Madeiras.
"""
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij', timeout=10)

db_container = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(db_name, sql):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {db_container} psql -U coliseu_admin -d {db_name} -c '{sql_escaped}' 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    return out

print("=== COLUNAS DE dash_vendas_itens ===")
print(run_query("coliseu_dashboard", "\d dash_vendas_itens"))

print("\n=== TOP 10 PRODUTOS (AGOSTO/2026) NO BANCO DE PRODUCAO ===")
print(run_query("coliseu_dashboard", """
    SELECT vi.produto, SUM(vi.valor_total) AS total_bruto,
           SUM(vi.valor_total * (1 - COALESCE(vi.desconto_item, 0)/100.0)) AS total_liquido
    FROM dash_vendas_itens vi
    JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
    WHERE v.data_hora_proc >= '2026-08-01' AND v.data_hora_proc <= '2026-08-31 23:59:59'
      AND v.processo IN (1, 2)
      AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
      AND v.depto_id = 1
    GROUP BY 1
    ORDER BY total_liquido DESC
    LIMIT 10;
"""))

client.close()
