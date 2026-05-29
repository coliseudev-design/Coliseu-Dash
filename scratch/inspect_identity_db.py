import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'

def get_companies_info():
    cmd_data = f'docker exec {CONTAINER} psql -U coliseu_admin -d coliseu_identity -A -c "SELECT * FROM companies"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        _, stdout, _ = client.exec_command(cmd_data)
        out = stdout.read().decode('utf-8').strip()
        lines = out.split('\n')
        if not lines:
            print("No data found")
            return
        headers = lines[0].split('|')
        print(f"Headers: {headers}")
        print("=== COMPANIES LISTING ===")
        for line in lines[1:]:
            if not line or '(7 rows)' in line or 'rows' in line:
                continue
            parts = line.split('|')
            if len(parts) == len(headers):
                row_data = dict(zip(headers, parts))
                filtered = {k: v for k, v in row_data.items() if 'id' in k.lower() or 'name' in k.lower() or 'serial' in k.lower() or 'key' in k.lower()}
                print(filtered)
    except Exception as e:
        print(f"[ERRO]: {e}")
    finally:
        client.close()

get_companies_info()
