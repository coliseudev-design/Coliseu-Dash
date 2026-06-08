import paramiko
import json

SSH_HOST = '177.39.17.7'
SSH_USER = 'root'
SSH_PASS = '6EFBC!c0:wzr%Ij'
FE_CONTAINER = "dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-151703817606"
MIDDLEWARE = "http://dashboard-middleware:3200"
LOGIN_EMAIL = "coliseudev@gmail.com"
LOGIN_PASS = "any"

def exec_api(client, token, path):
    cmd = f"""docker exec {FE_CONTAINER} wget -q -O - --header='Authorization: Bearer {token}' '{MIDDLEWARE}/api{path}' 2>&1"""
    stdin, stdout, stderr = client.exec_command(cmd)
    raw = stdout.read().decode('utf-8')
    try:
        return json.loads(raw)
    except:
        return {"raw": raw[:500]}

def run():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS)
        print("✅ SSH OK")

        # Login
        login_cmd = f"""docker exec {FE_CONTAINER} wget -q -O - --post-data='{{"email":"{LOGIN_EMAIL}","password":"{LOGIN_PASS}"}}' --header='Content-Type: application/json' {MIDDLEWARE}/api/auth/login 2>&1"""
        stdin, stdout, stderr = client.exec_command(login_cmd)
        login_data = json.loads(stdout.read().decode('utf-8'))
        token = login_data.get('token', '')
        print(f"✅ Login OK | tenant: {login_data.get('user', {}).get('tenant_id')}")

        if not token:
            print("❌ Sem token")
            return

        # ─── 1. STATUS REPORT (todos os status no banco) ────────────────────
        print("\n" + "═"*60)
        print("📊 STATUS REPORT — Todos os valores de status no banco")
        print("═"*60)
        sr = exec_api(client, token, "/debug/status-report")
        if "todos_status" in sr:
            print(f"\n{'STATUS':<30} {'QTDE':>8} {'TOTAL':>15}")
            print("-"*55)
            for row in sr["todos_status"]:
                print(f"{row['status_val']:<30} {row['count']:>8} R$ {float(row['total_valor'] or 0):>12,.2f}")
            
            print(f"\n\n{'STATUS MÊS ATUAL':}")
            print(f"{'STATUS':<30} {'QTDE':>8} {'TOTAL':>15}")
            print("-"*55)
            for row in sr.get("status_mes_atual", []):
                print(f"{row['status_val']:<30} {row['count']:>8} R$ {float(row['total_valor'] or 0):>12,.2f}")
        else:
            print(sr)

        # ─── 2. VENDAS-DIA para 01/06/2026 ──────────────────────────────────
        print("\n" + "═"*60)
        print("📅 VENDAS DO DIA 01/06/2026 — Diagnóstico completo")
        print("═"*60)
        vd = exec_api(client, token, "/debug/vendas-dia?date=2026-06-01")
        if "total_geral" in vd:
            tg = vd["total_geral"]
            tf = vd["total_dash_filtrado"]
            print(f"\n Total GERAL (sem filtro):         {tg['count']:>4} pedidos  R$ {tg['valor']:>12,.2f}")
            print(f" Total DASH (FATURADO/FINALIZADO): {tf['count']:>4} pedidos  R$ {tf['valor']:>12,.2f}")
            print(f" ► DIFERENÇA (o que o Dash perde): {'':>4}          R$ {vd['diferenca']:>12,.2f}")

            print(f"\n{'STATUS':<30} {'QTDE':>8} {'TOTAL':>15}")
            print("-"*55)
            for row in vd["por_status"]:
                flag = " ◄ EXCLUÍDO PELO FILTRO" if row['status'] not in ('FATURADO', 'FINALIZADO') else " ✅"
                print(f"{row['status']:<30} {row['count']:>8} R$ {row['total']:>12,.2f}{flag}")

            print(f"\n\n{'AMOSTRA DE VENDAS DO DIA (top 20 por valor)':}")
            print(f"{'PEDIDO':<12} {'STATUS':<20} {'ESPECIE':<20} {'VENCIMENTO':<15} {'VALOR':>12}")
            print("-"*85)
            for v in vd.get("amostra_vendas", [])[:20]:
                venc = str(v.get("data_vencimento", "NULL"))[:10] if v.get("data_vencimento") else "NULL"
                print(f"{str(v['pedido'] or v['id']):<12} {str(v['status'] or 'NULL'):<20} {str(v['especie'] or ''):<20} {venc:<15} R$ {v['valor']:>10,.2f}")
        else:
            print(vd)

    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback; traceback.print_exc()
    finally:
        client.close()

if __name__ == '__main__':
    run()
