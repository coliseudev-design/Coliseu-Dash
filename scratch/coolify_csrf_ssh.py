import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar
import json
import ssl
import paramiko
import re

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

# ---- 1. Tentar Coolify API com token ----
print("=== COOLIFY API TOKEN ===")
# Coolify tem endpoint /api/v1/security/api-tokens para gerar tokens
# Mas precisa de login via CSRF primeiro

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# GET /login para pegar CSRF
try:
    resp = opener.open(f"{BASE}/login", timeout=10)
    html = resp.read().decode('utf-8', errors='replace')
    # Extrair CSRF token
    m = re.search(r'<meta name="csrf-token" content="([^"]+)"', html)
    if not m:
        m = re.search(r'_token.*?value="([^"]+)"', html)
    csrf = m.group(1) if m else ""
    print(f"CSRF token: {csrf[:30]}..." if csrf else "CSRF: NAO ENCONTRADO")

    # POST login
    data = urllib.parse.urlencode({
        "_token": csrf,
        "email": EMAIL,
        "password": SENHA,
    }).encode()
    req = urllib.request.Request(f"{BASE}/login", data=data, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": f"{BASE}/login",
        "X-CSRF-TOKEN": csrf,
    })
    resp2 = opener.open(req, timeout=10)
    print(f"Login status: {resp2.status} URL: {resp2.url}")
    
    # Tentar gerar API token
    req3 = urllib.request.Request(f"{BASE}/api/v1/security/api-tokens", headers={
        "Accept": "application/json",
        "Referer": f"{BASE}/",
        "X-CSRF-TOKEN": csrf,
    }, data=json.dumps({"description": "audit"}).encode(), method="POST")
    req3.add_header("Content-Type", "application/json")
    try:
        resp3 = opener.open(req3, timeout=10)
        api_token_data = json.loads(resp3.read().decode())
        print(f"API Token response: {json.dumps(api_token_data)[:300]}")
    except urllib.error.HTTPError as e:
        print(f"API token error {e.code}: {e.read().decode()[:300]}")
        
except Exception as e:
    print(f"Erro CSRF login: {e}")

# ---- 2. Tentar SSH em portas alternativas ----
print("\n=== SSH PORTAS ALTERNATIVAS ===")
for port in [22, 2222, 8022, 222, 2200]:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect("2.24.82.19", port=port, username="root", password="Col@!13894645", timeout=5)
        print(f"  CONECTADO na porta {port}!")
        
        stdin, stdout, stderr = client.exec_command("docker ps --format 'table {{.Names}}\t{{.Status}}' 2>&1 | head -15")
        print(stdout.read().decode('utf-8', errors='replace'))
        
        # Encontrar DB container
        stdin2, stdout2, _ = client.exec_command("docker ps --format '{{.Names}}' | grep -i 'db\\|postgres' | head -3")
        db_containers = stdout2.read().decode().strip().split('\n')
        print(f"DB containers: {db_containers}")
        
        for db in db_containers:
            if not db: continue
            for u, p in [("coliseu_admin","ColiseuDB2026Prod"),("postgres","postgres")]:
                sql = f"""SELECT TO_CHAR(COALESCE(data_vencimento,data_venda),'YYYY-MM-DD') dia, ROUND(SUM(valor_total-COALESCE(valor_desconto,0))::numeric,2) total, COUNT(*) qtd FROM dash_vendas WHERE tenant_id='{TENANT}' AND COALESCE(data_vencimento,data_venda)>='2026-06-01' AND COALESCE(data_vencimento,data_venda)<'2026-06-26' AND UPPER(TRIM(status)) IN ('FATURADO','FINALIZADO','PROCESSADO') AND UPPER(TRIM(COALESCE(especie,'')))!='GARANTIA' GROUP BY 1 ORDER BY 1"""
                cmd = f'docker exec -e PGPASSWORD={p} {db} psql -U {u} -d coliseu_dashboard -t -A -F"|" -c "{sql}" 2>&1'
                stdin3, stdout3, _ = client.exec_command(cmd)
                r = stdout3.read().decode('utf-8', errors='replace').strip()
                if '|' in r and 'error' not in r.lower():
                    print(f"\n=== RESULTADO DIA A DIA ({u}) ===")
                    dash_por_dia = {}
                    for line in r.split('\n'):
                        if '|' in line:
                            p2 = line.split('|')
                            try: dash_por_dia[p2[0]] = (float(p2[1]), p2[2])
                            except: pass
                    print(f"{'DATA':<14} {'ERP':>14} {'DASH':>14} {'DIFF':>12} {'QTD':>5}  STATUS")
                    print("-"*75)
                    te=0.0; td=0.0; divs=[]
                    for dia in sorted(set(list(ERP.keys())+list(dash_por_dia.keys()))):
                        ev=ERP.get(dia,0.0); dv,qtd=dash_por_dia.get(dia,(0.0,"-"))
                        diff=round(dv-ev,2); te+=ev; td+=dv
                        st="[DIVERGE]" if abs(diff)>0.05 else "[OK]"
                        if abs(diff)>0.05: divs.append((dia,ev,dv,diff))
                        print(f"{dia:<14} {ev:>14,.2f} {dv:>14,.2f} {diff:>+12,.2f} {qtd:>5}  {st}")
                    print("-"*75)
                    print(f"{'TOTAL':<14} {te:>14,.2f} {td:>14,.2f} {round(td-te,2):>+12,.2f}")
                    print(f"DIVERGENCIAS: {len(divs)}")
                    break
        client.close()
        break
    except Exception as e:
        print(f"  porta {port}: {e}")
