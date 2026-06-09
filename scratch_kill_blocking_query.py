import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_sql(db, sql):
    cmd = f"docker exec -i vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d {db}"
    stdin, stdout, stderr = client.exec_command(cmd)
    stdin.write(sql)
    stdin.close()
    
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== DB: {db} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# Terminate the blocking backend PID
# Replace 297744 with the dynamic PID if it changes, but we'll terminate the one currently blocking.
# Better yet, we can terminate all queries running cleanup_non_faturados.js by matching the query text.
run_sql("coliseu_dashboard", """
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE query LIKE '%DELETE FROM dash_vendas%' AND pid != pg_backend_pid();
""")

client.close()
