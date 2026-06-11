import paramiko

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'
DB_CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
TENANT_ID = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("OK: Conectado à VPS")

        # SQL query to reset sync metadata to June 1st, 2026
        sql = f"""
        UPDATE dash_sync_metadata
        SET ultima_sincronizacao = '2026-06-01 00:00:00+00', status = 'OK'
        WHERE tenant_id = '{TENANT_ID}' AND tabela IN ('dash_vendas', 'dash_vendas_itens');
        """
        
        # Execute query
        cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
        print("Executando reset do sync_metadata no Postgres de produção...")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8').strip()
        err = stderr.read().decode('utf-8').strip()
        
        if out:
            print("OUT:", out)
        if err:
            print("ERR:", err)
            
        # Verify new sync metadata values
        verify_sql = f"SELECT tabela, ultima_sincronizacao, status FROM dash_sync_metadata WHERE tenant_id = '{TENANT_ID}' AND tabela IN ('dash_vendas', 'dash_vendas_itens');"
        verify_cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{verify_sql}"'
        stdin, stdout, stderr = client.exec_command(verify_cmd)
        print("\n=== Nova Metadata de Sincronização ===")
        print(stdout.read().decode('utf-8'))

    except Exception as e:
        print(f"Erro durante execução: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
