import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'ColiseuDB2026Prod'

# We want to run a psql command on the server.
# Let's first inspect docker containers on the server to find the database container or run psql directly.
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print(f"Connecting to {HOST} via SSH...")
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    print("SSH connection succeeded!")
    
    # List containers
    stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}'")
    containers = stdout.read().decode('utf-8').split('\n')
    print("Containers on 2.24.82.19:")
    for c in containers:
        if c.strip():
            print(f" - {c.strip()}")
            
    # Run postgres query to check Alice sales
    # The database in 2.24.82.19 is probably in a container. Let's find if a postgres container exists.
    pg_container = None
    for c in containers:
        if 'db' in c or 'postgres' in c:
            pg_container = c.strip()
            break
            
    if pg_container:
        print(f"Found database container: {pg_container}")
        # Query 1: Find Alice
        sql = "SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE%'"
        cmd = f"docker exec {pg_container} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
        stdin, stdout, stderr = client.exec_command(cmd)
        print("=== Alice in vendedores ===")
        print(stdout.read().decode('utf-8'))
        
        # Query 2: June 2026 sales for Alice
        sql = """
            SELECT status, COUNT(*), SUM(valor_total)
            FROM dash_vendas
            WHERE vendedor_id_firebird IN (
                SELECT id_firebird FROM dash_vendedores WHERE nome ILIKE '%ALICE%'
            )
            AND data_venda >= '2026-06-01' AND data_venda <= '2026-06-07 23:59:59'
            GROUP BY status
        """
        cmd = f"docker exec {pg_container} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
        stdin, stdout, stderr = client.exec_command(cmd)
        print("=== Alice sales count by status ===")
        print(stdout.read().decode('utf-8'))
        
        # Query 3: June 2026 sales list for Alice
        sql = """
            SELECT id_firebird, numero_pedido, data_venda, valor_total, status, cfop
            FROM dash_vendas
            WHERE vendedor_id_firebird IN (
                SELECT id_firebird FROM dash_vendedores WHERE nome ILIKE '%ALICE%'
            )
            AND data_venda >= '2026-06-01' AND data_venda <= '2026-06-07 23:59:59'
            ORDER BY data_venda
        """
        cmd = f"docker exec {pg_container} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
        stdin, stdout, stderr = client.exec_command(cmd)
        print("=== Alice sales list ===")
        print(stdout.read().decode('utf-8'))
    else:
        # Maybe postgres is running natively
        print("No database container found with 'db' or 'postgres' in name. Trying native psql...")
        sql = "SELECT tenant_id, id_firebird, nome FROM dash_vendedores WHERE nome ILIKE '%ALICE%'"
        cmd = f"psql -U coliseu_user -d coliseu_db -c \"{sql}\""
        stdin, stdout, stderr = client.exec_command(cmd)
        print("=== Alice in vendedores ===")
        print(stdout.read().decode('utf-8'))
        
except Exception as e:
    print("Error:", e)
finally:
    client.close()
