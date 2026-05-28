import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    # Try using ssh-agent or default ssh keys
    client.connect('38.242.244.84', username='root')
    print("SSH connection to 38.242.244.84 succeeded!")
    
    def run_query(sql, label):
        cmd = f'psql -U coliseu_user -d coliseu_db -c "{sql}"'
        stdin, stdout, stderr = client.exec_command(cmd)
        print(f"=== {label} ===")
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err.strip():
            print("ERR:", err)

    run_query("SELECT DISTINCT tenant_id FROM dash_vendas LIMIT 5;", "Distinct Tenants")
    run_query("SELECT COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2025-12-01' AND data_venda <= '2025-12-31' AND TRIM(status) IN ('FATURADO', 'FINALIZADO');", "Sales Dec 2025")
    run_query("SELECT cfop, COUNT(*), SUM(valor_total) FROM dash_vendas WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f' AND data_venda >= '2025-12-01' AND data_venda <= '2025-12-31' GROUP BY cfop;", "Sales Dec 2025 by CFOP")
    run_query("SELECT COUNT(*) FROM dash_devolucoes WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';", "Devolucoes Count")
    run_query("SELECT * FROM dash_sync_metadata WHERE tenant_id = 'a822a7e7-fdd4-4483-bbb5-26587a72739f';", "Sync Metadata")

except Exception as e:
    print("SSH connection failed:", e)
finally:
    client.close()
