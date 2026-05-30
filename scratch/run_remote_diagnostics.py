import paramiko

def run_remote():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')
        print("Conectado ao SSH com sucesso!")
        
        # Executar psql no container coliseu-db, no banco VET
        db_container = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
        sql_query = "SELECT id, email, tenant_id FROM dash_usuarios LIMIT 5;"
        cmd = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard_vet -c "{sql_query}"'
        
        print(f"\n--- EXECUTANDO QUERY NO BANCO VET ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        print("STDOUT:")
        print(stdout.read().decode('utf-8'))
        print("STDERR:")
        print(stderr.read().decode('utf-8'))

    except Exception as e:
        print(f"Erro ao conectar ou executar comandos: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    run_remote()
