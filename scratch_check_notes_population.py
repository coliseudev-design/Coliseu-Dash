import paramiko

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'
TENANT = '2395efd5-6476-4f3c-a7b8-f31d5567b42f'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS, timeout=10)
    
    sql = (
        f"SELECT COUNT(*), "
        f"       COUNT(numero_nota) as non_null_nota, "
        f"       COUNT(CASE WHEN numero_nota IS NULL THEN 1 END) as null_nota "
        f"FROM dash_vendas "
        f"WHERE tenant_id = '{TENANT}';"
    )
    cmd = f"docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c \"{sql}\""
    _, stdout, _ = client.exec_command(cmd)
    print("=== INVOICE NUMBER POPULATION IN DB ===")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print("ERRO:", e)
finally:
    client.close()
