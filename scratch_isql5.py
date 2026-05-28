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

# TBNOTASSAIDA - todas colunas com valor
run_isql("TODAS COLUNAS TBNOTASSAIDA", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBNOTASSAIDA'
ORDER BY RDB$FIELD_POSITION;
""")

# Amostra de TBNOTASSAIDA para ver campos de data e valor
run_isql("TBNOTASSAIDA AMOSTRA 3 REGISTROS", """
SELECT FIRST 3 CHAVE, DATAEMISSAO, DATASAIDA, NUMDOCUMENTO, CODCLIENTE, CODVENDEDOR
FROM TBNOTASSAIDA;
""")

# Contar notas de saida em Dez 2025 usando DATAEMISSAO
run_isql("TBNOTASSAIDA - DEZ 2025", """
SELECT COUNT(*), SUM(VLRLIQUIDOTOTAL)
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01';
""")

# Buscar coluna de valor total em TBNOTASSAIDA
run_isql("TBNOTASSAIDA - COLUNAS VLR", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBNOTASSAIDA'
  AND UPPER(TRIM(RDB$FIELD_NAME)) LIKE '%VLR%'
ORDER BY RDB$FIELD_POSITION;
""")

# Verificar tabela de pedidos (TBNFX parece ser NF eletronica)
run_isql("COLUNAS TBNFX", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBNFX'
ORDER BY RDB$FIELD_POSITION;
""")

# Verificar tabela principal de pedidos de venda 
run_isql("TABELA TBPEDIDOFV COLUNAS", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBPEDIDOFV'
ORDER BY RDB$FIELD_POSITION;
""")
