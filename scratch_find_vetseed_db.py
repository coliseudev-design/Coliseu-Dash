import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'

# O VetSeed provavelmente é o PETCLUBCARANDA (pet shop / vet)
# Tentar com o banco PETCLUBCARANDA.FDB
BANCOS = [
    r'C:\FBDATA\PETCLUBCARANDA.FDB',
    r'C:\FBDATA\PETCLUBCARANDA110326.FDB',
]

def run_isql(label, sql, db):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252') as f:
        f.write(sql + '\nEXIT;\n')
        tmpfile = f.name
    
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, db]
        result = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=15)
        print(f"\n=== {label} (banco: {os.path.basename(db)}) ===")
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

# Primeiro precisamos copiar os bancos candidatos
import shutil
print("Copiando bancos candidatos...")

src_petclub = r'C:\Mac\Home\Documents\PROJETOS COLISEU\Bancodedados\PETCLUBCARANDA.FDB'
dst_petclub = r'C:\FBDATA\PETCLUBCARANDA.FDB'

if not os.path.exists(dst_petclub):
    print(f"Copiando {src_petclub}...")
    try:
        shutil.copy2(src_petclub, dst_petclub)
        print("OK")
    except Exception as e:
        print(f"Erro: {e}")
else:
    print("Arquivo já existe")

# Verificar tabelas de pedidos com IDs parecidos com o PG (< 30000)
for db in BANCOS:
    if os.path.exists(db):
        run_isql("TABELAS", """
SELECT TRIM(RDB$RELATION_NAME) 
FROM RDB$RELATIONS 
WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL
  AND (UPPER(RDB$RELATION_NAME) LIKE '%PEDID%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%VENDA%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%NF%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%NOTA%'
       OR UPPER(RDB$RELATION_NAME) LIKE '%SAIDA%')
ORDER BY RDB$RELATION_NAME;
""", db)
    else:
        print(f"\nBanco nao encontrado: {db}")
