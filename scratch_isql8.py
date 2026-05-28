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

# CANCELADA é INTEGER (0 = nao cancelada)
# DEZ 2025 total sem canceladas
run_isql("TBNOTASSAIDA - DEZ 2025 sem canceladas (CANCELADA=0)", """
SELECT COUNT(*) as qtd, SUM(VLRTOTALNOTA) as total
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01'
  AND CANCELADA = 0;
""")

# Por empresa em Dez 2025 (CANCELADA=0)
run_isql("TBNOTASSAIDA - DEZ 2025 POR EMPRESA (nao canceladas)", """
SELECT CODEMPRESA, COUNT(*) as qtd, SUM(VLRTOTALNOTA) as total
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01'
  AND CANCELADA = 0
GROUP BY CODEMPRESA
ORDER BY CODEMPRESA;
""")

# Ver quantas empresas tem em total de notas
run_isql("TBNOTASSAIDA - TOTAL POR EMPRESA 2025", """
SELECT CODEMPRESA, COUNT(*) as qtd, SUM(VLRTOTALNOTA) as total
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-01-01'
  AND CANCELADA = 0
GROUP BY CODEMPRESA
ORDER BY CODEMPRESA;
""")

# Verificar CFO (CFOP) para entender quais são vendas reais  
run_isql("TBNOTASSAIDA - CFOPS DEZ 2025 EMP 1", """
SELECT CFO, COUNT(*) as qtd, SUM(VLRTOTALNOTA) as total
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01'
  AND CANCELADA = 0
  AND CODEMPRESA = 1
GROUP BY CFO
ORDER BY total DESC
ROWS 15;
""")

# O que o VetSeed chama de "faturamento" - buscar pedidos de vendas em DEZ 2025
# Verificar se tem tabela de pedidos de venda (orcamento/pedido com status)
run_isql("TABELAS COM PEDIDO/VENDA", """
SELECT TRIM(RDB$RELATION_NAME) 
FROM RDB$RELATIONS 
WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL 
  AND (UPPER(RDB$RELATION_NAME) LIKE '%PEDID%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%OMENT%')
ORDER BY RDB$RELATION_NAME;
""")

# TBPEDIDOFBIT colunas
run_isql("COLUNAS TBPEDIDOFBIT", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBPEDIDOFBIT'
ORDER BY RDB$FIELD_POSITION;
""")
