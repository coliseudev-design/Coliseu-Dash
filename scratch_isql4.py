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
            print(result.stdout[:4000])
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

# Colunas de TBNOTASSAIDA (notas de saida)
run_isql("COLUNAS TBNOTASSAIDA", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBNOTASSAIDA'
ORDER BY RDB$FIELD_POSITION;
""")

# Colunas de TBPEDVENDAS
run_isql("COLUNAS TBPEDVENDAS", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBPEDVENDAS'
ORDER BY RDB$FIELD_POSITION;
""")

# Contar notas de saida em Dez 2025
run_isql("TBNOTASSAIDA - DEZ 2025 contagem", """
SELECT COUNT(*), SUM(VLRLIQUIDO) 
FROM TBNOTASSAIDA
WHERE DTEMISSAO >= '2025-12-01' AND DTEMISSAO < '2026-01-01';
""")

# Contar pedidos vendas em Dez 2025
run_isql("TBPEDVENDAS - DEZ 2025 contagem", """
SELECT COUNT(*), SUM(VLRTOTALLIQUIDO)
FROM TBPEDVENDAS
WHERE DTPEDIDO >= '2025-12-01' AND DTPEDIDO < '2026-01-01';
""")
