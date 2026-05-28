import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'

# Verificar se PIVETA.FDB está acessível
PIVETA = r'C:\Coliseu\Data\PIVETA.FDB'
PIVETA_COPY = r'C:\FBDATA\PIVETA.FDB'

def run_isql(label, sql, db=None):
    if db is None:
        db = PIVETA_COPY
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252', errors='replace') as f:
        f.write(sql + '\nEXIT;\n')
        tmpfile = f.name
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, db]
        r = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=20)
        print(f"\n=== {label} ===")
        if r.stdout.strip(): print(r.stdout[:3000])
        if r.stderr.strip(): print("ERR:", r.stderr[:300])
    except subprocess.TimeoutExpired:
        print(f"\n=== {label} === [TIMEOUT]")
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
    finally:
        try: os.unlink(tmpfile)
        except: pass

# 1. Verificar se PIVETA está disponível diretamente
print("=== Verificando PIVETA.FDB direto ===")
if os.path.exists(PIVETA):
    print(f"PIVETA existe em: {PIVETA}")
else:
    print(f"NAO encontrado em: {PIVETA}")

if os.path.exists(PIVETA_COPY):
    print(f"Cópia existe em: {PIVETA_COPY}")
else:
    print(f"Cópia NAO existe: {PIVETA_COPY}")
    print("Copiando PIVETA.FDB...")
    import shutil
    try:
        shutil.copy2(PIVETA, PIVETA_COPY)
        print("OK - copiado")
    except Exception as e:
        print(f"ERRO ao copiar: {e}")

# 2. Vendas dezembro 2025 no PIVETA
run_isql("PIVETA - Vendas Dez 2025 (tbnotassaida)", """
SELECT COUNT(*) AS QTD, SUM(vlrtotalnota) AS TOTAL
FROM tbnotassaida
WHERE cancelada = 0
  AND codempresa = 1
  AND dataemissao >= '2025-12-01'
  AND dataemissao <  '2026-01-01'
  AND cfo IN (5101,5102,5103,5104,5105,5106,5108,5109,5110,5111,5112,5113,
              5114,5115,5116,5118,5119,5120,5122,5123,
              5251,5252,5253,5254,5255,5256,5257,5258,
              5401,5402,5403,5405,
              6101,6102,6103,6104,6105,6106,6107,6108,6109,6110,6111,6112,6113,
              6114,6115,6116,6118,6119,6120,6122,6123,
              6251,6252,6253,6254,6255,6256,6257,6258,
              6401,6402,6403,6404)
""")

# 3. Total geral sem filtro CFOP
run_isql("PIVETA - Vendas Dez 2025 SEM filtro CFOP", """
SELECT COUNT(*) AS QTD, SUM(vlrtotalnota) AS TOTAL
FROM tbnotassaida
WHERE cancelada = 0
  AND codempresa = 1
  AND dataemissao >= '2025-12-01'
  AND dataemissao <  '2026-01-01'
""")

# 4. CFOPs de dezembro 2025
run_isql("PIVETA - CFOPs distintos Dez 2025", """
SELECT cfo, COUNT(*) AS qtd, SUM(vlrtotalnota) AS total
FROM tbnotassaida
WHERE cancelada = 0
  AND codempresa = 1
  AND dataemissao >= '2025-12-01'
  AND dataemissao <  '2026-01-01'
GROUP BY cfo
ORDER BY total DESC
""")

# 5. Total de notas no Firebird vs PostgreSQL
print("\n=== PostgreSQL - VetSeed Dez 2025 ===")
import subprocess as sp
pg_cmd = [
    'ssh', '-i', r'C:\Users\kleber\.ssh\id_rsa',
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ConnectTimeout=10',
    'root@38.242.244.84',
    'psql -U coliseu_user -d coliseu_db -c "SELECT COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric,2) as total FROM dash_vendas WHERE tenant_id=\'a822a7e7-fdd4-4483-bbb5-26587a72739f\' AND EXTRACT(YEAR FROM data_venda)=2025 AND EXTRACT(MONTH FROM data_venda)=12 AND status=\'FATURADO\';"'
]
try:
    r2 = sp.run(pg_cmd, capture_output=True, text=True, timeout=15)
    if r2.stdout: print(r2.stdout)
    if r2.stderr: print("ERR:", r2.stderr[:200])
except Exception as e:
    print(f"PG ERRO: {e}")
