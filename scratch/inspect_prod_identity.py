import paramiko

HOST     = '2.24.82.19'
USER     = 'root'
PASSWORD = 'Col@13894645'
PG_CONTAINER = 'vasjsucz4yxcb7m4rtqindd2'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to Prod VPS")

        # Query company modules for the specific company in coliseu_garantias
        sql = "SELECT * FROM company_modules WHERE \"CompanyId\" = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6';"
        cmd = f"docker exec -i {PG_CONTAINER} psql -U coliseu_admin -d coliseu_garantias -c '{sql}'"
        stdin, stdout, stderr = client.exec_command(cmd)
        print("Company Modules for Teste Compensados:")
        print(stdout.read().decode('utf-8'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
