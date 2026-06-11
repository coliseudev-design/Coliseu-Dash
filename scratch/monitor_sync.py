import paramiko
import time

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

        # Query metadata
        meta_query = f"""
        SELECT tabela, ultima_sincronizacao, status, registros_sincronizados
        FROM dash_sync_metadata
        WHERE tenant_id = '{TENANT_ID}' AND tabela IN ('dash_vendas', 'dash_vendas_itens', '__heartbeat__')
        ORDER BY tabela;
        """
        
        # Query target orders
        orders_query = f"""
        SELECT id_firebird, numero_pedido, data_venda, valor_total, valor_custo, valor_desconto, status
        FROM dash_vendas
        WHERE tenant_id = '{TENANT_ID}' AND id_firebird IN ('20193', '20192', '20191', '20187')
        ORDER BY id_firebird DESC;
        """

        print("\n=== Verificando Status da Sincronização ===")
        _, stdout, _ = client.exec_command(f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{meta_query}"')
        print(stdout.read().decode('utf-8'))

        print("\n=== Verificando Valores dos Pedidos no Banco ===")
        _, stdout, _ = client.exec_command(f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{orders_query}"')
        print(stdout.read().decode('utf-8'))

    except Exception as e:
        print(f"Erro: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
