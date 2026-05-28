import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'
DB = r'C:\FBDATA\DBSISCOM.FDB'

def run_isql(label, sql):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252') as f:
        f.write(sql + '\nEXIT;\n')
        tmpfile = f.name
    
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, DB]
        result = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=30)
        print(f"\n=== {label} ===")
        if result.stdout.strip():
            print(result.stdout[:5000])
        if result.stderr.strip():
            print("ERR:", result.stderr[:500])
    except subprocess.TimeoutExpired:
        print(f"\n=== {label} === [TIMEOUT]")
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
    finally:
        try:
            os.unlink(tmpfile)
        except:
            pass

# TBNFX - Dez 2025 contagem e total (NFs nao canceladas)
run_isql("TBNFX - DEZ 2025 (nao canceladas)", """
SELECT COUNT(*), SUM(VLRTOTAL)
FROM TBNFX
WHERE DATA >= '2025-12-01' AND DATA < '2026-01-01'
  AND (CANCELADA IS NULL OR CANCELADA <> 'S');
""")

# TBNFX - Todos os status em Dez 2025
run_isql("TBNFX - DEZ 2025 (todos)", """
SELECT CANCELADA, COUNT(*), SUM(VLRTOTAL)
FROM TBNFX
WHERE DATA >= '2025-12-01' AND DATA < '2026-01-01'
GROUP BY CANCELADA;
""")

# TBNFX - Meses com dados
run_isql("TBNFX - MESES COM DADOS (2025-2026)", """
SELECT EXTRACT(YEAR FROM DATA) as ano, EXTRACT(MONTH FROM DATA) as mes, 
       COUNT(*) as qtd, SUM(VLRTOTAL) as total
FROM TBNFX
WHERE DATA >= '2025-01-01'
  AND (CANCELADA IS NULL OR CANCELADA <> 'S')
GROUP BY EXTRACT(YEAR FROM DATA), EXTRACT(MONTH FROM DATA)
ORDER BY ano, mes;
""")

# TBNOTASSAIDA - DEZ 2025 com DATAEMISSAO e VLRTOTALNOTA
run_isql("TBNOTASSAIDA - DEZ 2025", """
SELECT COUNT(*), SUM(VLRTOTALNOTA)
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01';
""")

# TBNOTASSAIDA - Meses com dados (2025-2026)
run_isql("TBNOTASSAIDA - MESES COM DADOS", """
SELECT EXTRACT(YEAR FROM DATAEMISSAO) as ano, EXTRACT(MONTH FROM DATAEMISSAO) as mes, 
       COUNT(*) as qtd, SUM(VLRTOTALNOTA) as total
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-01-01'
GROUP BY EXTRACT(YEAR FROM DATAEMISSAO), EXTRACT(MONTH FROM DATAEMISSAO)
ORDER BY ano, mes;
""")

# Verificar campo FLSITUACAO/STATUS da nota de saida
run_isql("TBNOTASSAIDA - CAMPO STATUS/SITUACAO", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBNOTASSAIDA'
  AND (UPPER(TRIM(RDB$FIELD_NAME)) LIKE '%STATUS%'
       OR UPPER(TRIM(RDB$FIELD_NAME)) LIKE '%SITUA%'
       OR UPPER(TRIM(RDB$FIELD_NAME)) LIKE '%CANC%'
       OR UPPER(TRIM(RDB$FIELD_NAME)) LIKE '%FL%')
ORDER BY RDB$FIELD_POSITION;
""")
