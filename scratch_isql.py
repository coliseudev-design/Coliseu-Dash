import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'
DB = r'C:\Mac\Home\Documents\PROJETOS COLISEU\Bancodedados\DBSISCOM.FDB'

def run_isql(label, sql):
    # Criar arquivo temporário com o SQL
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252') as f:
        f.write(sql + '\nEXIT;\n')
        tmpfile = f.name
    
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, DB]
        result = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=15)
        print(f"\n=== {label} ===")
        if result.stdout.strip():
            print(result.stdout)
        if result.stderr.strip():
            print("ERR:", result.stderr[:500])
    except subprocess.TimeoutExpired:
        print(f"\n=== {label} === [TIMEOUT]")
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
    finally:
        os.unlink(tmpfile)

# Listar tabelas
run_isql("TABELAS", """
SELECT TRIM(RDB$RELATION_NAME) 
FROM RDB$RELATIONS 
WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL 
ORDER BY RDB$RELATION_NAME;
""")
