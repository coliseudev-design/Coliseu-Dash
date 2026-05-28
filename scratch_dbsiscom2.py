import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'
DB = r'C:\FBDATA\DBSISCOM.FDB'

def run_isql(label, sql):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252', errors='replace') as f:
        # isql needs semicolon terminator, then QUIT on its own line
        f.write(sql.strip() + ';\n')
        f.write('QUIT;\n')
        tmpfile = f.name
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, DB]
        r = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=30)
        print(f"\n=== {label} ===")
        out = r.stdout.strip()
        if out: print(out[:3000])
        err = r.stderr.strip()
        if err: print("ERR:", err[:300])
    except subprocess.TimeoutExpired:
        print(f"\n=== {label} === [TIMEOUT]")
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
    finally:
        try: os.unlink(tmpfile)
        except: pass

# 1. CFOPs de venda cadastrados
run_isql("CFOPs de VENDA (tbcadcfossaida)", 
"SELECT cfoestadual, descricao FROM tbcadcfossaida WHERE descricao CONTAINING 'VENDA' ORDER BY cfoestadual")

# 2. Todos os CFOPs em Dez 2025
run_isql("CFOPs distintos Dez 2025 em tbnotassaida",
"SELECT cfo, COUNT(*) AS qtd, SUM(vlrtotalnota) AS total FROM tbnotassaida WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao < '2026-01-01' GROUP BY cfo ORDER BY qtd DESC")

# 3. Total bruto sem filtro CFOP
run_isql("Total Dez 2025 SEM filtro CFOP",
"SELECT COUNT(*) AS QTD, SUM(vlrtotalnota) AS TOTAL FROM tbnotassaida WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao < '2026-01-01'")

# 4. Com filtro CFOPs do worker (divido em partes para evitar bug isql IN longo)
run_isql("Vendas Dez 2025 - CFOP 5xxx",
"SELECT COUNT(*) AS QTD, SUM(vlrtotalnota) AS TOTAL FROM tbnotassaida WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao < '2026-01-01' AND cfo BETWEEN 5100 AND 5999")

run_isql("Vendas Dez 2025 - CFOP 6xxx",
"SELECT COUNT(*) AS QTD, SUM(vlrtotalnota) AS TOTAL FROM tbnotassaida WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao < '2026-01-01' AND cfo BETWEEN 6100 AND 6999")

# 5. Range de chaves
run_isql("Range chave Dez 2025",
"SELECT MIN(chave) AS min_chave, MAX(chave) AS max_chave, COUNT(*) AS total FROM tbnotassaida WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao < '2026-01-01'")

# 6. Total geral no banco (sem filtro de data)
run_isql("Total geral tbnotassaida",
"SELECT COUNT(*) AS QTD, MIN(dataemissao) AS data_min, MAX(dataemissao) AS data_max FROM tbnotassaida WHERE cancelada = 0 AND codempresa = 1")
