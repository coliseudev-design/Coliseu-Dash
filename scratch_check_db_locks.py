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

# Find container name dynamically
stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
print(f"Active container: {container_name}")

# Check running processes inside the container
if container_name:
    stdin, stdout, stderr = client.exec_command(f"docker exec {container_name} ps aux")
    print("=== Processes inside container ===")
    print(stdout.read().decode('utf-8'))

# Check active queries in Postgres
run_sql("coliseu_dashboard", """
SELECT pid, age(clock_timestamp(), query_start), usename, state, query 
FROM pg_stat_activity 
WHERE query NOT LIKE '%pg_stat_activity%' AND state != 'idle';
""")

# Check lock wait status in Postgres
run_sql("coliseu_dashboard", """
SELECT blocked_locks.pid     AS blocked_pid,
       blocked_activity.usename  AS blocked_user,
       blocking_locks.pid    AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query    AS blocked_statement,
       blocking_activity.query   AS blocking_statement
FROM  pg_catalog.pg_locks         blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks         blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
""")

client.close()
