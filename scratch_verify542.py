import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'
DB = r'C:\FBDATA\DBSISCOM.FDB'

def run_isql(label, sql):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252', errors='replace') as f:
        f.write(sql.strip() + ';\n')
        f.write('QUIT;\n')
        tmpfile = f.name
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, DB]
        r = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=30)
        print(f"\n=== {label} ===")
        out = r.stdout.strip()
        if out: print(out[:4000])
        err = r.stderr.strip()
        if err: print("ERR:", err[:300])
    except subprocess.TimeoutExpired:
        print(f"\n=== {label} === [TIMEOUT]")
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
    finally:
        try: os.unlink(tmpfile)
        except: pass

# Vendas EXATAS com os CFOPs certos (542 esperados)
run_isql("Vendas Dez 2025 CFO 5102+5405+6102 (devem ser 542)",
"SELECT COUNT(*) AS QTD, SUM(vlrtotalnota) AS TOTAL FROM tbnotassaida WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao < '2026-01-01' AND cfo IN (5102, 5405, 6102)")

# Range de chaves para esses 542
run_isql("Range chave dos 542",
"SELECT MIN(chave) AS min_chave, MAX(chave) AS max_chave, COUNT(*) AS total FROM tbnotassaida WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao < '2026-01-01' AND cfo IN (5102, 5405, 6102)")

# PostgreSQL - via psql local ou SSH
print("\n=== Verificando PostgreSQL ===")
ssh_cmd = [
    'ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=8',
    'root@38.242.244.84',
    """psql -U coliseu_user -d coliseu_db -c "SELECT COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric,2) as total, MIN(id_firebird) as min_id, MAX(id_firebird) as max_id FROM dash_vendas WHERE tenant_id='a822a7e7-fdd4-4483-bbb5-26587a72739f' AND EXTRACT(YEAR FROM data_venda)=2025 AND EXTRACT(MONTH FROM data_venda)=12;" """
]
try:
    r2 = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=15)
    print(r2.stdout[:1000] if r2.stdout else "sem output")
    if r2.returncode != 0: print("ERR:", r2.stderr[:200])
except Exception as e:
    print(f"SSH ERRO: {e}")
    
# Verificar delta cache SQLite do worker
print("\n=== Delta Cache SQLite do workerVet ===")
import glob
sqlite_paths = [
    r'C:\Mac\Home\Documents\GitHub\workerVet\worker\delta_cache.db',
    r'C:\Mac\Home\Documents\GitHub\workerVet\delta_cache.db',
    r'C:\Mac\Home\Documents\GitHub\workerVet\worker\bin\Debug\net8.0\delta_cache.db',
    r'C:\Mac\Home\Documents\GitHub\workerVet\worker\bin\Release\net8.0\delta_cache.db',
    r'C:\Mac\Home\Documents\GitHub\workerVet\worker\publish\delta_cache.db',
]
for p in sqlite_paths:
    if os.path.exists(p):
        print(f"ENCONTRADO: {p} ({os.path.getsize(p)} bytes)")
    
# Procurar em disco
result = subprocess.run(['where', '/r', r'C:\Mac\Home\Documents\GitHub\workerVet', 'delta_cache.db'],
                       capture_output=True, text=True)
if result.stdout.strip():
    print("Encontrado via where:", result.stdout.strip())

# Verificar Release_v2.5.45
release_path = r'C:\Mac\Home\Documents\GitHub\workerVet\Release_v2.5.45'
if os.path.exists(release_path):
    files = os.listdir(release_path)
    print(f"\nRelease dir: {files[:20]}")
    db_files = [f for f in files if f.endswith('.db') or f.endswith('.sqlite')]
    print(f"DB files: {db_files}")
