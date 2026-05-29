import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard_vet -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# 1. Check max sales date in coliseu_dashboard_vet
run_query("MAX DATE VET DB",
          "SELECT MAX(data_venda) AS max_date FROM dash_vendas")

# 2. Count of sales with/without CFOP in coliseu_dashboard_vet
run_query("CFOP COUNT VET DB",
          """SELECT COUNT(*) as total_vendas, COUNT(cfop) as total_com_cfop
             FROM dash_vendas""")

# 3. Sum of sales in Dec 2025 in coliseu_dashboard_vet WITH VET CFOP and Status filter
run_query("VET SALES IN DEC 2025 (WITH VET FILTERS)",
          """SELECT COUNT(*) as count, SUM(valor_total) as total
             FROM dash_vendas v
             WHERE v.data_venda >= '2025-12-01 00:00:00' AND v.data_venda <= '2025-12-31 23:59:59'
               AND v.cfop IN (5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123, 5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258, 5401, 5402, 5403, 5405, 6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123, 6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258, 6401, 6402, 6403, 6404)
               AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')""")

# 4. Devolutions in Dec 2025 in coliseu_dashboard_vet
run_query("DEVOLUTIONS IN DEC 2025 VET DB",
          """SELECT COUNT(*) as count, SUM(valor) as total
             FROM dash_devolucoes
             WHERE data_devolucao >= '2025-12-01 00:00:00' AND data_devolucao <= '2025-12-31 23:59:59'""")
