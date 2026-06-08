import paramiko
import json

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
FE_CONTAINER = "dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-001830874671"
MIDDLEWARE = "http://dashboard-middleware:3200"

def run_test():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)
        print("✅ Connected to VPS via SSH")

        # 1. Login to get token for test tenant (Petclub)
        login_cmd = (
            f"docker exec {FE_CONTAINER} wget -q -O - "
            f"--post-data='{{\"email\":\"robersonsouza@outlook.com\",\"password\":\"any\"}}' "
            f"--header='Content-Type: application/json' "
            f"{MIDDLEWARE}/api/auth/login"
        )
        stdin, stdout, stderr = client.exec_command(login_cmd)
        res_text = stdout.read().decode('utf-8').strip()
        try:
            login_data = json.loads(res_text)
        except Exception as e:
            print("Error parsing login response:", res_text)
            return

        token = login_data.get('token')
        tenant_id = login_data.get('user', {}).get('tenant_id')
        print(f"✅ Logged in successfully. Tenant: {tenant_id}")

        # 2. Query commercial KPIs for 2026-06-01 (custom date filter)
        kpis_url = (
            f"{MIDDLEWARE}/api/bi/sales/commercial-kpis"
            f"?period=custom&start_date=2026-06-01T00:00:00.000Z&end_date=2026-06-01T23:59:59.999Z"
        )
        cmd = (
            f"docker exec {FE_CONTAINER} wget -q -O - "
            f"--header='Authorization: Bearer {token}' "
            f"'{kpis_url}'"
        )
        stdin, stdout, stderr = client.exec_command(cmd)
        kpi_res = stdout.read().decode('utf-8').strip()
        print("=== Commercial KPIs for 01/06/2026 ===")
        try:
            kpi_data = json.loads(kpi_res)
            print(f"Faturamento total: R$ {kpi_data.get('faturamento_total'):,.2f}")
            print(f"Total pedidos: {kpi_data.get('total_pedidos')}")
            print("Recent Orders (first 5):")
            for order in kpi_data.get('recent_orders', [])[:5]:
                print(f"ID: {order.get('id')} | Nota: {order.get('numero_nota')} | Cliente: {order.get('cliente')} | Data: {order.get('data')} | Valor: {order.get('valor')}")
        except Exception as e:
            print("Raw response:", kpi_res)

    except Exception as e:
        print("❌ Error:", e)
    finally:
        client.close()

if __name__ == '__main__':
    run_test()
