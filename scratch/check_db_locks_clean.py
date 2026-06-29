import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_sql(db, sql):
    cmd = f"docker exec -i vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d {db} --quiet -A -F ',' -P footer=off"
    stdin, stdout, stderr = client.exec_command(cmd)
    stdin.write(sql)
    stdin.close()
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    return out, err

print("=== ACTIVE QUERIES ===")
out, err = run_sql("coliseu_dashboard", """
SELECT pid, substring(query from 1 for 100) as query_short, age(clock_timestamp(), query_start) as duration, state
FROM pg_stat_activity 
WHERE query NOT LIKE '%pg_stat_activity%' AND state != 'idle';
""")
print(out)
if err: print("ERR:", err)

print("=== BLOCKED LOCKS ===")
out, err = run_sql("coliseu_dashboard", """
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       substring(blocked_activity.query from 1 for 100) AS blocked_query,
       substring(blocking_activity.query from 1 for 100) AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
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
print(out)
if err: print("ERR:", err)

client.close()
