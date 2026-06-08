import paramiko

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'ColiseuDB2026Prod'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to production VPS 2.24.82.19")

        # Discover active postgres container name
        stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep -E 'db|postgres'")
        db_containers = stdout.read().decode('utf-8').strip().split('\n')
        print("DB Containers:", db_containers)
        
        db_container = None
        for name in db_containers:
            if 'coliseu-db' in name or 'postgres' in name or 'db' in name:
                db_container = name
                break
        
        if not db_container:
            # Fallback to listing all and picking first
            stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}'")
            all_containers = stdout.read().decode('utf-8').strip().split('\n')
            for name in all_containers:
                if 'db' in name or 'postgres' in name:
                    db_container = name
                    break
        
        if not db_container:
            print("Error: DB container not found on production!")
            return
            
        print(f"Using DB Container: {db_container}")

        # Query sales for today (2026-06-08)
        sql = """
SELECT id_firebird, numero_pedido, data_venda::text, data_vencimento::text, data_hora_proc::text, valor_total, status, sincronizado_em::text, tenant_id 
FROM dash_vendas 
WHERE data_venda::date = '2026-06-08' OR data_hora_proc::date = '2026-06-08' OR sincronizado_em::date = '2026-06-08'
ORDER BY data_venda DESC;
"""
        sql_escaped = sql.replace('"', '\\"')
        cmd = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
        
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        
        print("=== SALES IN PRODUCTION ===")
        print(out)
        if err:
            print("=== ERROR ===")
            print(err)

        # Query items for today's sales
        sql_items = """
SELECT vi.id_firebird, vi.venda_id_firebird, vi.produto, vi.quantidade, vi.preco_unitario, vi.valor_total, v.numero_pedido 
FROM dash_vendas_itens vi
JOIN dash_vendas v ON v.id_firebird = vi.venda_id_firebird AND v.tenant_id = vi.tenant_id
WHERE v.data_venda::date = '2026-06-08' OR v.data_hora_proc::date = '2026-06-08' OR v.sincronizado_em::date = '2026-06-08';
"""
        sql_items_escaped = sql_items.replace('"', '\\"')
        cmd_items = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_items_escaped}"'
        
        stdin, stdout, stderr = client.exec_command(cmd_items)
        out_items = stdout.read().decode('utf-8', errors='replace').strip()
        print("=== SALES ITEMS IN PRODUCTION ===")
        print(out_items)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
