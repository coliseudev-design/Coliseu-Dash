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
            print(result.stdout[:3000])
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

# Listar tabelas
run_isql("TABELAS CANDIDATAS", """
SELECT TRIM(RDB$RELATION_NAME) 
FROM RDB$RELATIONS 
WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL 
ORDER BY RDB$RELATION_NAME;
""")
