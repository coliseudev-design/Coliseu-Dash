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

        # Query company modules versions
        sql = "SELECT \"CompanyId\", \"ModuleSlug\", \"Versions\" FROM company_modules;"
        cmd = f"docker exec -i {PG_CONTAINER} psql -U coliseu_admin -d coliseu_identity -c '{sql}'"
        stdin, stdout, stderr = client.exec_command(cmd)
        print("Versions data in company_modules:")
        print(stdout.read().decode('utf-8'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
