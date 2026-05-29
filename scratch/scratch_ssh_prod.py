import subprocess

def run_ssh(sql):
    ssh_cmd = [
        'ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=8',
        'root@38.242.244.84',
        f'psql -U coliseu_user -d coliseu_db -c "{sql}"'
    ]
    try:
        r = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=15)
        print(f"\n=== Query: {sql} ===")
        print(r.stdout if r.stdout else "(sem stdout)")
        if r.stderr:
            print("STDERR:", r.stderr)
    except Exception as e:
        print(f"Error: {e}")

# 1. Sum of sales in Dec 2025 (without CFOP filter)
run_ssh("SELECT COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id='a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59'")

# 2. Sum of sales in Dec 2025 (with VET status filter but no CFOP filter)
run_ssh("SELECT COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id='a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59' AND UPPER(TRIM(status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')")

# 3. Sum of sales in Dec 2025 (with CFOP filter and status filter)
run_ssh("SELECT COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id='a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2025-12-01 00:00:00' AND data_venda <= '2025-12-31 23:59:59' AND cfop IN (5102, 5405, 6102) AND UPPER(TRIM(status)) NOT IN ('CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE')")

# 4. Check if CFOP values are populated in the production database
run_ssh("SELECT cfop, COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id='a822a7e7-fdd4-4483-bbb5-26587a72739f' GROUP BY cfop")
