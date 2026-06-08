import paramiko
import json
import sys

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"
FE_CONTAINER = "dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-001830874671"
MIDDLEWARE = "http://dashboard-middleware:3200"

def run_sql(client, sql):
    cmd = f'docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8').strip()
    err = stderr.read().decode('utf-8').strip()
    return out, err

def run_integration_test():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)
        print("✅ Connected to VPS via SSH")

        # 0. Clean up any previous test order
        run_sql(client, "DELETE FROM dash_vendas WHERE id_firebird = 999999;")

        # 1. Insert test order
        # data_venda (emission) is 2026-05-25
        # data_vencimento (billing) is 2026-06-01
        insert_sql = (
            "INSERT INTO dash_vendas (id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, tenant_id, vendedor_id_firebird) "
            "VALUES (999999, 999999, '2026-05-25 09:30:00+00', '2026-06-01 10:00:00+00', 259.90, 'FATURADO', '816f97c4-66fb-4ef8-905d-e0551cbf2492', 1);"
        )
        out, err = run_sql(client, insert_sql)
        if "INSERT 0 1" in out:
            print("✅ Successfully inserted test order 999999 (Luiz Carlos Rocha simulation)")
        else:
            print("❌ Failed to insert test order:", out, err)
            sys.exit(1)

        # 2. Login to test tenant
        login_cmd = (
            f"docker exec {FE_CONTAINER} wget -q -O - "
            f"--post-data='{{\"email\":\"robersonsouza@outlook.com\",\"password\":\"any\"}}' "
            f"--header='Content-Type: application/json' "
            f"{MIDDLEWARE}/api/auth/login"
        )
        stdin, stdout, stderr = client.exec_command(login_cmd)
        res_text = stdout.read().decode('utf-8').strip()
        login_data = json.loads(res_text)
        token = login_data.get('token')
        print("✅ Logged in successfully")

        # 3. Query commercial-kpis for 2026-05-25
        query_url_25 = (
            f"{MIDDLEWARE}/api/bi/sales/commercial-kpis"
            f"?period=custom&start_date=2026-05-25T00:00:00.000Z&end_date=2026-05-25T23:59:59.999Z"
        )
        cmd_25 = (
            f"docker exec {FE_CONTAINER} wget -q -O - "
            f"--header='Authorization: Bearer {token}' "
            f"'{query_url_25}'"
        )
        stdin, stdout, stderr = client.exec_command(cmd_25)
        res_25 = json.loads(stdout.read().decode('utf-8').strip())
        
        print("\n=== Results for 25/05/2026 (Emission Date) ===")
        print(f"Faturamento Total: R$ {res_25.get('faturamento_total'):,.2f}")
        print(f"Total pedidos: {res_25.get('total_pedidos')}")
        orders_25 = [o['id'] for o in res_25.get('recent_orders', [])]
        print(f"Orders returned: {orders_25}")
        
        # 4. Query commercial-kpis for 2026-06-01
        query_url_01 = (
            f"{MIDDLEWARE}/api/bi/sales/commercial-kpis"
            f"?period=custom&start_date=2026-06-01T00:00:00.000Z&end_date=2026-06-01T23:59:59.999Z"
        )
        cmd_01 = (
            f"docker exec {FE_CONTAINER} wget -q -O - "
            f"--header='Authorization: Bearer {token}' "
            f"'{query_url_01}'"
        )
        stdin, stdout, stderr = client.exec_command(cmd_01)
        res_01 = json.loads(stdout.read().decode('utf-8').strip())
        
        print("\n=== Results for 01/06/2026 (Billing/Faturamento Date) ===")
        print(f"Faturamento Total: R$ {res_01.get('faturamento_total'):,.2f}")
        print(f"Total pedidos: {res_01.get('total_pedidos')}")
        orders_01 = [o['id'] for o in res_01.get('recent_orders', [])]
        print(f"Orders returned: {orders_01}")

        # 5. Assertions
        assert "999999" not in orders_25, "Assertion failed: Order 999999 appeared on emission date (25/05)!"
        assert "999999" in orders_01, "Assertion failed: Order 999999 did not appear on billing/faturamento date (01/06)!"
        print("\n✅ INTEGRATION TEST PASSED! The date filter correctly uses the billing date instead of the emission date.")

    except Exception as e:
        print("❌ Error:", e)
    finally:
        # Clean up
        print("Cleaning up test order...")
        run_sql(client, "DELETE FROM dash_vendas WHERE id_firebird = 999999;")
        client.close()

if __name__ == '__main__':
    run_integration_test()
