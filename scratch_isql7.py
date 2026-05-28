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

# TBNOTASSAIDA - por empresa em Dez 2025
run_isql("TBNOTASSAIDA - DEZ 2025 POR EMPRESA", """
SELECT CODEMPRESA, COUNT(*), SUM(VLRTOTALNOTA), SUM(VLRMERC)
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01'
  AND (CANCELADA IS NULL OR CANCELADA <> 'S')
GROUP BY CODEMPRESA
ORDER BY CODEMPRESA;
""")

# Verificar empresas registradas no banco
run_isql("EMPRESAS DO BANCO", """
SELECT FIRST 10 TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBEMPRESA'
ORDER BY RDB$FIELD_POSITION;
""")

run_isql("EMPRESAS LISTA", """
SELECT CHAVE, TRIM(RAZAO), TRIM(CNPJ)
FROM TBEMPRESA
ORDER BY CHAVE;
""")

# Verificar se tem alguma empresa que corresponde ao VetSeed (Pet/Vet)
run_isql("TBNOTASSAIDA - DEZ 2025 CFO (CFOP)", """
SELECT CFO, COUNT(*), SUM(VLRTOTALNOTA)
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01'
  AND CODEMPRESA = 1
  AND (CANCELADA IS NULL OR CANCELADA <> 'S')
GROUP BY CFO
ORDER BY SUM(VLRTOTALNOTA) DESC
ROWS 10;
""")

# Verificar total sem canceladas para empresa 1 em Dez 2025
run_isql("TBNOTASSAIDA - DEZ 2025 EMP1 sem canceladas", """
SELECT COUNT(*) as qtd, SUM(VLRTOTALNOTA) as total, SUM(VLRMERC) as mercadorias
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01'
  AND CODEMPRESA = 1
  AND (CANCELADA IS NULL OR CANCELADA <> 'S');
""")

# Ver amostra de notas
run_isql("TBNOTASSAIDA - AMOSTRA DEZ 2025", """
SELECT FIRST 5 CHAVE, NUMDOCUMENTO, DATAEMISSAO, CODEMPRESA, CODCLIENTE, VLRTOTALNOTA, CANCELADA, NFE_STATUS
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01'
ORDER BY CHAVE;
""")
