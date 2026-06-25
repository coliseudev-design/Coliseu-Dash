import paramiko
import json

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'
DB_CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec -i {DB_CONTAINER} psql -U coliseu_admin -d {db} -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        return out, err
    except Exception as e:
        return "", str(e)
    finally:
        client.close()

def main():
    print("--- 1. Inspecting dash_vendas schema ---")
    out, err = run_query("\d dash_vendas")
    print(out)
    if err: print("ERR:", err)

    print("\n--- 2. Checking June 24, 2026 sales for Brandao (1ca30f62-4487-4103-b529-c6d7b041b245) ---")
    sql = """
    SELECT 
        id_firebird, 
        numero_pedido, 
        data_venda, 
        data_vencimento,
        data_hora_proc,
        valor_total, 
        valor_desconto, 
        status, 
        cfop, 
        numero_nota
    FROM dash_vendas
    WHERE tenant_id = '1ca30f62-4487-4103-b529-c6d7b041b245'
      AND (
        (data_venda >= '2026-06-23 00:00:00' AND data_venda <= '2026-06-25 23:59:59')
        OR (data_vencimento >= '2026-06-23 00:00:00' AND data_vencimento <= '2026-06-25 23:59:59')
      );
    """
    out, err = run_query(sql)
    print(out)
    if err: print("ERR:", err)

if __name__ == '__main__':
    main()
