import subprocess

TENANT_VET = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'

queries = [
    ("VetSeed DEZ 2025 - Total FATURADO",
     f"SELECT COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric,2) as total FROM dash_vendas WHERE tenant_id='{TENANT_VET}' AND EXTRACT(YEAR FROM data_venda)=2025 AND EXTRACT(MONTH FROM data_venda)=12 AND status='FATURADO';"),
    
    ("VetSeed DEZ 2025 - Todos status",
     f"SELECT status, COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric,2) as total FROM dash_vendas WHERE tenant_id='{TENANT_VET}' AND EXTRACT(YEAR FROM data_venda)=2025 AND EXTRACT(MONTH FROM data_venda)=12 GROUP BY status;"),
    
    ("VetSeed - Range id_firebird DEZ 2025",
     f"SELECT MIN(id_firebird) as min_id, MAX(id_firebird) as max_id, COUNT(*) FROM dash_vendas WHERE tenant_id='{TENANT_VET}' AND EXTRACT(YEAR FROM data_venda)=2025 AND EXTRACT(MONTH FROM data_venda)=12;"),
    
    ("VetSeed - Sync metadata",
     f"SELECT tabela, ultima_sincronizacao, registros_sincronizados, status, erro_mensagem FROM dash_sync_metadata WHERE tenant_id='{TENANT_VET}' ORDER BY ultima_sincronizacao DESC;"),
    
    ("Todos tenants na dash_vendas",
     "SELECT tenant_id, COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric,2) as total FROM dash_vendas GROUP BY tenant_id ORDER BY qtd DESC LIMIT 10;"),
]

for label, q in queries:
    cmd = ['ssh', '-i', r'C:\Users\kleber\.ssh\id_rsa',
           '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=8',
           'root@38.242.244.84', f'psql -U coliseu_user -d coliseu_db -c "{q}"']
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        print(f"\n=== {label} ===")
        if r.stdout: print(r.stdout[:1500])
        if r.returncode != 0 and r.stderr: print("ERR:", r.stderr[:200])
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
