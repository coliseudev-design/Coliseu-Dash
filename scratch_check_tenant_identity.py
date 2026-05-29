import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

def run_query(sql, db="coliseu_dashboard"):
    sql_escaped = sql.replace("'", "'\\''")
    cmd = f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d {db} -c '{sql_escaped}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8')

with open("scratch_identity_search.txt", "w", encoding="utf-8") as f:
    f.write("Searching in coliseu_identity:\n")
    f.write(run_query("SELECT * FROM companies WHERE \"Name\" ILIKE '%vet%' OR \"ContactEmail\" ILIKE '%vet%'", db="coliseu_identity"))
    f.write("\n" + run_query("SELECT * FROM admin_users WHERE \"Email\" ILIKE '%vet%' OR \"Name\" ILIKE '%vet%'", db="coliseu_identity"))
    f.write("\nSearching in coliseu_dashboard:\n")
    f.write(run_query("SELECT * FROM dash_usuarios WHERE email ILIKE '%vet%' OR nome ILIKE '%vet%'", db="coliseu_dashboard"))

client.close()
print("Saved to scratch_identity_search.txt")
