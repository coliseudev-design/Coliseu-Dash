import paramiko

HOST = '38.242.244.84'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij' # might use SSH key, but we can try without password if key is used, or try this pass

def run_query(label, sql):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'psql -U coliseu_user -d coliseu_db -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        # Try connecting with password, or default SSH keys if no password works
        try:
            client.connect(HOST, username=USER, password=PASS, timeout=10)
        except Exception as e:
            # Fallback to key-based authentication if agent/keys are configured
            client.connect(HOST, username=USER, timeout=10)
            
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        print(f"\n=== {label} ===")
        print(out or "(sem resultado)")
        if err.strip():
            print("ERR:", err)
    except Exception as e:
        print(f"[ERRO] {label}: {e}")
    finally:
        client.close()

# 1. Total sales with non-null CFOP on production
run_query("PROD - SALES WITH NON-NULL CFOP BY TENANT",
          """SELECT tenant_id, COUNT(*) as count_non_null, SUM(valor_total) as sum_total
             FROM dash_vendas
             WHERE cfop IS NOT NULL
             GROUP BY tenant_id""")

# 2. CFOP distribution for Vet in Dec 2025 on production
run_query("PROD - VET CFOP DISTRIBUTION DEZ 2025",
          """SELECT cfop, COUNT(*), SUM(valor_total) as total
             FROM dash_vendas
             WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
               AND data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'
             GROUP BY cfop""")

# 3. Vet sales by status in Dec 2025 on production
run_query("PROD - VET SALES BY STATUS DEZ 2025",
          """SELECT TRIM(status) as status, COUNT(*) as count, SUM(valor_total) as total
             FROM dash_vendas
             WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'
               AND data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'
             GROUP BY TRIM(status)""")

# 4. Exact query from overview on production
run_query("PROD - EXACT VMES QUERY FROM OVERVIEW",
          """SELECT COALESCE(SUM(v.valor_total),0) AS total, COUNT(*) AS qtd 
             FROM dash_vendas v 
             WHERE v.tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' 
               AND v.data_venda >= '2025-12-01 00:00:00' AND v.data_venda <= '2025-12-31 23:59:59'
               AND v.cfop IN (5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123, 5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258, 5401, 5402, 5403, 5405, 6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123, 6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258, 6401, 6402, 6403, 6404)
               AND UPPER(TRIM(v.status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')""")
