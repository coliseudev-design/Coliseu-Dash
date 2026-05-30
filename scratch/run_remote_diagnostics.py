import paramiko

def run_remote():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')
        print("Conectado ao SSH com sucesso!")
        
        db_container = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
        
        # REVERTER: Setar use_vet_db = false para todos os usuários que 
        # foram marcados incorretamente (tenant a822a7e7 não tem dados no VET)
        # e o cliente@teste.com.br também não tem dados no VET.
        # Vamos zerar TODOS e só manter o que faz sentido.
        sql_revert = """
            UPDATE dash_usuarios 
            SET use_vet_db = false 
            WHERE use_vet_db = true;
        """
        cmd_revert = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_revert}"'
        print("\n--- REVERTENDO use_vet_db PARA TODOS OS USUÁRIOS ---")
        stdin, stdout, stderr = client.exec_command(cmd_revert)
        print(stdout.read().decode('utf-8'))
        print(stderr.read().decode('utf-8'))
        
        # Confirmar que todos estão como false
        sql_check = "SELECT id, email, tenant_id, use_vet_db FROM dash_usuarios ORDER BY email LIMIT 20;"
        cmd_check = f'docker exec {db_container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_check}"'
        print("\n--- VERIFICANDO ESTADO FINAL ---")
        stdin2, stdout2, stderr2 = client.exec_command(cmd_check)
        print(stdout2.read().decode('utf-8'))
        print(stderr2.read().decode('utf-8'))

    except Exception as e:
        print(f"Erro ao conectar ou executar comandos: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    run_remote()
