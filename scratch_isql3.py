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

# Tabelas relacionadas a pedidos/vendas/NF
run_isql("TABELAS PEDIDO/VENDA/NF", """
SELECT TRIM(RDB$RELATION_NAME) 
FROM RDB$RELATIONS 
WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL 
  AND (UPPER(RDB$RELATION_NAME) LIKE '%PEDIDO%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%VENDA%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%NF%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%NOTA%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%SAIDA%')
ORDER BY RDB$RELATION_NAME;
""")

# Colunas da tabela principal de pedidos (tentando TBPEDIDO)
run_isql("COLUNAS TBPEDIDOS", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBPEDIDOS'
ORDER BY RDB$FIELD_POSITION;
""")

run_isql("COLUNAS TBPEDIDO", """
SELECT TRIM(RDB$FIELD_NAME)
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = 'TBPEDIDO'
ORDER BY RDB$FIELD_POSITION;
""")
