import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

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

start = "2025-12-01 00:00:00"
end = "2025-12-31 23:59:59"

for tenant in ["a822a7e7-fdd4-4483-bbb5-26587a72739f", "ed1d3a98-4c4d-48db-99c0-8751926eb8e5"]:
    print(f"\n================ TENANT {tenant} ================")
    
    # 1. Vet Context Sales
    v_vet_sql = f"""
    SELECT COALESCE(SUM(v.valor_total),0) AS total, COUNT(*) AS qtd 
    FROM dash_vendas v 
    WHERE v.tenant_id = '{tenant}' 
      AND v.data_venda >= '{start}' AND v.data_venda <= '{end}'
      AND v.cfop IN ({cfop_in_list})
      AND UPPER(TRIM(v.status)) NOT IN ({status_not_in_list});
    """
    sales_vet_total = run_query(v_vet_sql)
    
    # 2. Non-Vet Context Sales
    v_main_sql = f"""
    SELECT COALESCE(SUM(v.valor_total),0) AS total, COUNT(*) AS qtd 
    FROM dash_vendas v 
    WHERE v.tenant_id = '{tenant}' 
      AND v.data_venda >= '{start}' AND v.data_venda <= '{end}'
      AND TRIM(v.status) IN ('FATURADO', 'FINALIZADO');
    """
    sales_main_total = run_query(v_main_sql)
    
    # 3. Vet Context Devolutions
    d_vet_sql = f"""
    SELECT COALESCE(SUM(d.valor),0) AS total 
    FROM dash_devolucoes d 
    WHERE d.tenant_id = '{tenant}' 
      AND d.data_devolucao >= '{start}' AND d.data_devolucao <= '{end}';
    """
    dev_vet_total = run_query(d_vet_sql)
    
    # 4. Non-Vet Context Devolutions
    d_main_sql = f"""
    SELECT COALESCE(SUM(d.valor),0) AS total 
    FROM dash_devolucoes d 
    LEFT JOIN dash_vendas v2 ON v2.id_firebird = d.venda_id_firebird AND v2.tenant_id = d.tenant_id 
    WHERE d.tenant_id = '{tenant}' 
      AND d.data_devolucao >= '{start}' AND d.data_devolucao <= '{end}';
    """
    dev_main_total = run_query(d_main_sql)
    
    print(f"VET Sales:       {sales_vet_total}")
    print(f"VET Devolutions: {dev_vet_total}")
    print(f"MAIN Sales:      {sales_main_total}")
    print(f"MAIN Devolutions:{dev_main_total}")

client.close()
