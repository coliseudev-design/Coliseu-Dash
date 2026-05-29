import subprocess

TENANT_VET = '3edd56b4-e002-48ed-8ecb-131c0c62dcfb'

queries = [
    ("Usuarios em Producao",
     "SELECT id, nome, email, tenant_id, layout_version FROM dash_usuarios;"),
    ("Empresas/Tenants em Producao",
     "SELECT DISTINCT tenant_id FROM dash_vendas;"),
]

for label, q in queries:
    cmd = ['ssh', '-i', r'C:\Users\kleber\.ssh\id_rsa',
           '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=8',
           'root@38.242.244.84', f'psql -U coliseu_user -d coliseu_db -c "{q}"']
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        print(f"\n=== {label} ===")
        if r.stdout: print(r.stdout[:1500])
        if r.returncode != 0 and r.stderr: print("ERR:", r.stderr[:200])
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
