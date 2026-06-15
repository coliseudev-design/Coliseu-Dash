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

        for db in ['coliseu_identity', 'coliseu_garantias']:
            print(f"\n================ DB: {db} ================")
            sql = """
            SELECT table_name FROM information_schema.tables WHERE table_schema='public';
            """
            cmd = f"docker exec -i {PG_CONTAINER} psql -U coliseu_admin -d {db} -c \"{sql}\""
            _, stdout, _ = client.exec_command(cmd)
            print("Tables:")
            print(stdout.read().decode('utf-8'))

            # Search for company ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6 in company_modules or other tables in this DB
            sql_cm = "SELECT * FROM company_modules WHERE \"CompanyId\" = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6';"
            cmd_cm = f"docker exec -i {PG_CONTAINER} psql -U coliseu_admin -d {db} -c \"{sql_cm}\""
            _, stdout, _ = client.exec_command(cmd_cm)
            print("Company modules:")
            print(stdout.read().decode('utf-8'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
