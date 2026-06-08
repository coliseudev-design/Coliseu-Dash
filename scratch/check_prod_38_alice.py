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

# Query 1: Find Alice
run_ssh("SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE%'")

# Query 2: June 2026 sales for Alice
run_ssh("""
    SELECT status, COUNT(*), SUM(valor_total)
    FROM dash_vendas
    WHERE vendedor_id_firebird IN (
        SELECT id_firebird FROM dash_vendedores WHERE nome ILIKE '%ALICE%'
    )
    AND data_venda >= '2026-06-01' AND data_venda <= '2026-06-07 23:59:59'
    GROUP BY status
""")

# Query 3: June 2026 sales list for Alice
run_ssh("""
    SELECT id_firebird, numero_pedido, data_venda, valor_total, status, cfop
    FROM dash_vendas
    WHERE vendedor_id_firebird IN (
        SELECT id_firebird FROM dash_vendedores WHERE nome ILIKE '%ALICE%'
    )
    AND data_venda >= '2026-06-01' AND data_venda <= '2026-06-07 23:59:59'
    ORDER BY data_venda
""")
