import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
VET_TENANT = "a822a7e7-fdd4-4483-bbb5-26587a72739f"

SALES_CFOPS = [
    5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123,
    5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258,
    5401, 5402, 5403, 5405,
    6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123,
    6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258,
    6401, 6402, 6403, 6404
]

SALES_STATUS_EXCLUDE = [
    'CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE'
]

cfop_in_list = ",".join(map(str, SALES_CFOPS))
status_not_in_list = ",".join(f"'{s}'" for s in SALES_STATUS_EXCLUDE)

def run_query(sql):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -t -A -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    res = stdout.read().decode('utf-8').strip()
    return res

# ----------------- CASE 1: MAIN CONTEXT (NON-VET) -----------------
# For main: status is IN ('FATURADO', 'FINALIZADO') and NO CFOP filter.
main_sales_sql = f"""
SELECT COALESCE(SUM(valor_total), 0)
FROM dash_vendas
WHERE tenant_id = '{VET_TENANT}'
  AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
  AND TRIM(status) IN ('FATURADO', 'FINALIZADO');
"""
main_sales = float(run_query(main_sales_sql))

main_dev_sql = f"""
SELECT COALESCE(SUM(d.valor), 0)
FROM dash_devolucoes d
LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id
WHERE d.tenant_id = '{VET_TENANT}'
  AND d.data_devolucao >= '2025-12-01' AND d.data_devolucao < '2026-01-01';
"""
main_dev = float(run_query(main_dev_sql))
main_net = main_sales - main_dev

# ----------------- CASE 2: VET CONTEXT (V4.0) -----------------
# For vet: CFOP filter + status exclusion, and direct devolucoes sum.
vet_sales_sql = f"""
SELECT COALESCE(SUM(valor_total), 0)
FROM dash_vendas
WHERE tenant_id = '{VET_TENANT}'
  AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
  AND cfop IN ({cfop_in_list})
  AND UPPER(TRIM(status)) NOT IN ({status_not_in_list});
"""
vet_sales = float(run_query(vet_sales_sql))

vet_dev_sql = f"""
SELECT COALESCE(SUM(valor), 0)
FROM dash_devolucoes
WHERE tenant_id = '{VET_TENANT}'
  AND data_devolucao >= '2025-12-01' AND data_devolucao < '2026-01-01';
"""
vet_dev = float(run_query(vet_dev_sql))
vet_net = vet_sales - vet_dev

print("=== DEZEMBRO 2025 ALIGNMENT RESULTS ===")
print("--- MAIN CONTEXT ---")
print(f"Sales:       R$ {main_sales:,.2f}")
print(f"Devolucoes:  R$ {main_dev:,.2f}")
print(f"Net Sales:   R$ {main_net:,.2f}")
print("\n--- VET CONTEXT (LAYOUT 4) ---")
print(f"Sales:       R$ {vet_sales:,.2f}  (Expected 0.00 since cfop is null in current DB)")
print(f"Devolucoes:  R$ {vet_dev:,.2f}")
print(f"Net Sales:   R$ {vet_net:,.2f}")

client.close()
