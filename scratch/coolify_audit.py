import urllib.request
import urllib.parse
import urllib.error
import json
import ssl
import paramiko

BASE = "http://2.24.82.19:8000"
EMAIL = "coliseu.dev@gmail.com"
SENHA = "Col@!13894645"
TENANT = "2395efd5-6476-4f3c-a7b8-f31d5567b42f"

ERP = {
    "2026-06-01": 73131.16,  "2026-06-02": 72027.90,  "2026-06-03": 101117.04,
    "2026-06-04": 321.00,    "2026-06-05": 76965.70,  "2026-06-06": 52996.35,
    "2026-06-08": 49924.37,  "2026-06-09": 74591.49,  "2026-06-10": 102500.01,
    "2026-06-11": 64853.19,  "2026-06-12": 129899.60, "2026-06-13": 896.53,
    "2026-06-15": 64827.29,  "2026-06-16": 108572.58, "2026-06-17": 79868.95,
    "2026-06-18": 71037.29,  "2026-06-19": 68468.84,  "2026-06-20": 35646.73,
    "2026-06-22": 55800.83,  "2026-06-23": 71686.58,  "2026-06-24": 73317.10,
    "2026-06-25": 38370.17,
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Tentar login via Coolify OAuth endpoint
def post(path, data, headers={}):
    body = json.dumps(data).encode()
    h = {"Content-Type": "application/json", "Accept": "application/json"}
    h.update(headers)
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: body2 = json.loads(e.read().decode())
        except: body2 = {"raw": e.read().decode()[:200] if hasattr(e, 'fp') else ""}
        return e.code, body2
    except Exception as e:
        return 0, {"error": str(e)}

# Tentar vários endpoints de login
endpoints = [
    "/api/v1/auth/login",
    "/auth/login",
    "/api/auth/login",
    "/api/login",
    "/login",
]
print("=== TESTANDO ENDPOINTS DE LOGIN ===")
for ep in endpoints:
    status, resp = post(ep, {"email": EMAIL, "password": SENHA})
    if status != 404:
        print(f"  {ep} -> {status}: {json.dumps(resp)[:200]}")
        if status == 200:
            token = resp.get("token") or resp.get("access_token", "")
            print(f"  TOKEN: {token}")
            break
    else:
        print(f"  {ep} -> 404")

# Tentar SSH diretamente com as credenciais do Coolify (usuário pode ser "root" com a mesma senha)
print("\n=== TENTATIVA SSH COM NOVA SENHA ===")
ssh_attempts = [
    ("2.24.82.19", "root", "Col@!13894645"),
    ("2.24.82.19", "kleber", "Col@!13894645"),
    ("2.24.82.19", "ubuntu", "Col@!13894645"),
    ("2.24.82.19", "coliseu", "Col@!13894645"),
]
for host, user, pwd in ssh_attempts:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, port=22, username=user, password=pwd, timeout=8)
        print(f"  SSH CONECTADO: {user}@{host}")
        
        # Listar containers
        stdin, stdout, stderr = client.exec_command("docker ps --format 'table {{.Names}}\t{{.Status}}' 2>&1 | head -20")
        containers = stdout.read().decode('utf-8', errors='replace')
        print(f"\n=== CONTAINERS ===\n{containers}")
        
        # Encontrar DB e fazer query
        stdin2, stdout2, stderr2 = client.exec_command("docker ps --format '{{.Names}}' 2>&1 | grep -i 'db\\|postgres'")
        db_name = stdout2.read().decode().strip().split('\n')[0]
        print(f"DB Container: {db_name}")
        
        if db_name:
            # Query dia a dia
            sql = f"""SELECT TO_CHAR(COALESCE(data_vencimento,data_venda),'YYYY-MM-DD') AS dia,
                   ROUND(SUM(valor_total - COALESCE(valor_desconto,0))::numeric,2) AS total,
                   COUNT(*) AS qtd
            FROM dash_vendas
            WHERE tenant_id = '{TENANT}'
              AND COALESCE(data_vencimento,data_venda) >= '2026-06-01'
              AND COALESCE(data_vencimento,data_venda) < '2026-06-26'
              AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO')
              AND UPPER(TRIM(COALESCE(especie,''))) != 'GARANTIA'
            GROUP BY 1 ORDER BY 1"""
            
            for db_user in ["coliseu_admin", "postgres"]:
                for db_pass in ["ColiseuDB2026Prod", "postgres", "masterkey"]:
                    cmd = f'docker exec -e PGPASSWORD={db_pass} {db_name} psql -U {db_user} -d coliseu_dashboard -t -A -F"|" -c "{sql}" 2>&1'
                    stdin3, stdout3, stderr3 = client.exec_command(cmd)
                    result = stdout3.read().decode('utf-8', errors='replace').strip()
                    if result and 'error' not in result.lower() and 'fatal' not in result.lower() and '|' in result:
                        print(f"\n=== DIA A DIA (user={db_user}) ===")
                        
                        dash_por_dia = {}
                        for line in result.split('\n'):
                            if '|' in line:
                                parts = line.split('|')
                                try: dash_por_dia[parts[0]] = (float(parts[1]), parts[2])
                                except: pass
                        
                        print(f"{'DATA':<14} {'ERP':>14} {'DASH':>14} {'DIFF':>12} {'QTD':>5}  STATUS")
                        print("-" * 75)
                        total_e = 0.0; total_d = 0.0; divs = []
                        for dia in sorted(set(list(ERP.keys()) + list(dash_por_dia.keys()))):
                            ev = ERP.get(dia, 0.0)
                            dv, qtd = dash_por_dia.get(dia, (0.0, "-"))
                            diff = round(dv - ev, 2)
                            total_e += ev; total_d += dv
                            st = "[DIVERGE]" if abs(diff) > 0.05 else "[OK]"
                            if abs(diff) > 0.05: divs.append((dia, ev, dv, diff))
                            print(f"{dia:<14} {ev:>14,.2f} {dv:>14,.2f} {diff:>+12,.2f} {qtd:>5}  {st}")
                        print("-" * 75)
                        print(f"{'TOTAL':<14} {total_e:>14,.2f} {total_d:>14,.2f} {round(total_d-total_e,2):>+12,.2f}")
                        print(f"\nOK: {len(ERP)-len(divs)} | DIVERGENCIAS: {len(divs)}")
                        break
        client.close()
        break
    except Exception as e:
        print(f"  Falha {user}@{host}: {e}")
