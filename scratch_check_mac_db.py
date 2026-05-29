import psycopg2
import sys

hosts = ['127.0.0.1', '10.211.55.2', '10.211.55.1']
ports = [5432, 5433]
credentials = [
    ('coliseu_admin', 'ColiseuDB2026Prod', 'coliseu_dashboard'),
    ('coliseu_admin', 'coliseu_local_test_2026', 'coliseu_dashboard_local'),
    ('postgres', '', 'postgres'),
    ('coliseu_user', 'ColiseuDB2026Prod', 'coliseu_db'),
]

for host in hosts:
    for port in ports:
        for user, passwd, dbname in credentials:
            try:
                conn = psycopg2.connect(
                    host=host,
                    port=port,
                    user=user,
                    password=passwd,
                    dbname=dbname,
                    connect_timeout=2
                )
                print(f"[SUCCESS] Connected to {host}:{port} db={dbname} user={user}")
                # Query tenants
                cur = conn.cursor()
                cur.execute("SELECT DISTINCT tenant_id FROM dash_vendas")
                rows = cur.fetchall()
                print("Tenants:", rows)
                conn.close()
            except Exception as e:
                # print(f"[FAIL] {host}:{port} db={dbname} user={user}: {e}")
                pass
print("Done checking local/Mac hosts.")
