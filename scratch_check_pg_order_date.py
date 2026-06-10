import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'
DB_CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'

try:
    print(f"Connecting to VPS {HOST} via SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD)
    
    # Query for order 529739
    sql = "SELECT id_firebird, numero_pedido, data_venda, data_vencimento, data_hora_proc, status, valor_total FROM dash_vendas WHERE id_firebird = 529739"
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    
    print("Executing query in Postgres container...")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    print("\n=== QUERY RESULT ===")
    print(out)
    if err.strip():
        print("ERR:", err)
        
    client.close()
except Exception as e:
    print("SSH/Query failed:", e)
