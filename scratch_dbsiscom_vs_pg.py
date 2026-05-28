import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'
DB = r'C:\FBDATA\DBSISCOM.FDB'

def run_isql(label, sql):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252', errors='replace') as f:
        f.write(sql + '\nEXIT;\n')
        tmpfile = f.name
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, DB]
        r = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=30)
        print(f"\n=== {label} ===")
        if r.stdout.strip(): print(r.stdout[:4000])
        if r.stderr.strip(): print("ERR:", r.stderr[:300])
    except subprocess.TimeoutExpired:
        print(f"\n=== {label} === [TIMEOUT]")
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
    finally:
        try: os.unlink(tmpfile)
        except: pass

# 1. CFOPs de venda cadastrados no DBSISCOM (mesmo filtro do worker)
run_isql("CFOPs de VENDA (tbcadcfossaida)", """
SELECT cfoestadual, descricao
FROM tbcadcfossaida
WHERE descricao CONTAINING 'VENDA'
ORDER BY cfoestadual
""")

# 2. Vendas Dez 2025 com filtro EXATO do worker (CFOPs hardcoded + dinâmicos)
#    Worker adiciona: 5108, 6108, 6102 e exclui 5117, 6117
run_isql("Vendas Dez 2025 - CFOPs fixos do worker (5101-6404)", """
SELECT COUNT(*) AS QTD, SUM(vlrtotalnota) AS TOTAL_BRUTO
FROM tbnotassaida
WHERE cancelada = 0
  AND codempresa = 1
  AND dataemissao >= '2025-12-01'
  AND dataemissao <  '2026-01-01'
  AND cfo IN (
    5101,5102,5103,5104,5105,5106,5108,5109,5110,5111,5112,5113,
    5114,5115,5116,5118,5119,5120,5122,5123,
    5251,5252,5253,5254,5255,5256,5257,5258,
    5401,5402,5403,5405,
    6101,6102,6103,6104,6105,6106,6107,6108,6109,6110,6111,6112,6113,
    6114,6115,6116,6118,6119,6120,6122,6123,
    6251,6252,6253,6254,6255,6256,6257,6258,
    6401,6402,6403,6404
  )
""")

# 3. Todos os CFOPs distintos em Dez 2025
run_isql("CFOPs distintos Dez 2025 em tbnotassaida", """
SELECT cfo, COUNT(*) AS qtd, SUM(vlrtotalnota) AS total
FROM tbnotassaida
WHERE cancelada = 0
  AND codempresa = 1
  AND dataemissao >= '2025-12-01'
  AND dataemissao <  '2026-01-01'
GROUP BY cfo
ORDER BY qtd DESC
""")

# 4. Total geral sem filtro CFOP
run_isql("Total Dez 2025 SEM filtro CFOP (base bruta)", """
SELECT COUNT(*) AS QTD, SUM(vlrtotalnota) AS TOTAL
FROM tbnotassaida
WHERE cancelada = 0
  AND codempresa = 1
  AND dataemissao >= '2025-12-01'
  AND dataemissao <  '2026-01-01'
""")

# 5. ID range máximo sincronizado vs máximo no Firebird
run_isql("Range chave Dez 2025", """
SELECT MIN(chave) AS min_chave, MAX(chave) AS max_chave, COUNT(*) AS total
FROM tbnotassaida
WHERE cancelada = 0
  AND codempresa = 1
  AND dataemissao >= '2025-12-01'
  AND dataemissao <  '2026-01-01'
""")

# 6. PostgreSQL via SSH
print("\n=== PostgreSQL VetSeed Dez 2025 ===")
pg_queries = [
    ("Total FATURADO", "SELECT COUNT(*) as qtd, ROUND(SUM(valor_total)::numeric,2) as total FROM dash_vendas WHERE tenant_id='a822a7e7-fdd4-4483-bbb5-26587a72739f' AND EXTRACT(YEAR FROM data_venda)=2025 AND EXTRACT(MONTH FROM data_venda)=12 AND status='FATURADO';"),
    ("Max id_firebird", "SELECT MIN(id_firebird) as min_id, MAX(id_firebird) as max_id, COUNT(*) FROM dash_vendas WHERE tenant_id='a822a7e7-fdd4-4483-bbb5-26587a72739f' AND EXTRACT(YEAR FROM data_venda)=2025 AND EXTRACT(MONTH FROM data_venda)=12;"),
]
for label, q in pg_queries:
    pg_cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10',
              'root@38.242.244.84', f'psql -U coliseu_user -d coliseu_db -c "{q}"']
    try:
        r2 = subprocess.run(pg_cmd, capture_output=True, text=True, timeout=20)
        print(f"\n-- {label} --")
        if r2.stdout: print(r2.stdout[:1000])
        if r2.returncode != 0 and r2.stderr: print("ERR:", r2.stderr[:200])
    except Exception as e:
        print(f"PG ERRO: {e}")
