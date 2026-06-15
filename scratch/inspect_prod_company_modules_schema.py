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

        # Query all columns of company_modules table
        sql = """
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'company_modules'
        ORDER BY ordinal_position;
        """
        cmd = f"docker exec -i {PG_CONTAINER} psql -U coliseu_admin -d coliseu_identity -c \"{sql}\""
        stdin, stdout, stderr = client.exec_command(cmd)
        print("company_modules columns in Prod:")
        print(stdout.read().decode('utf-8'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
