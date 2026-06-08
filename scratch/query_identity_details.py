import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, label):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_identity -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {label} ===")
    print(stdout.read().decode('utf-8'))

run_query(
    'SELECT "Id", "CompanyId", "Name", "Key" FROM branches WHERE "Name" ILIKE \'%pet%\';',
    "Branches in coliseu_identity matching pet"
)

run_query(
    'SELECT "Id", "Name" FROM companies WHERE "Name" ILIKE \'%pet%\';',
    "Companies in coliseu_identity matching pet"
)

client.close()
