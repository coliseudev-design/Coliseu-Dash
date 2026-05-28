"""
Script para verificar dados diretamente no Firebird local do VetSeed
Caminho correto: C:\Mac\Home\Documents\PROJETOS COLISEU\Bancodados\DBSISCOM.FDB
"""
import sys
import subprocess

DB_PATH = r'C:\Mac\Home\Documents\PROJETOS COLISEU\Bancodados\DBSISCOM.FDB'

# Firebird server info
FB_HOST = 'localhost'
FB_USER = 'SYSDBA'
FB_PASS = 'masterkey'

def check_fdb():
    try:
        import fdb
        return True
    except:
        return False

if not check_fdb():
    print("Instalando fdb...")
    subprocess.run([sys.executable, "-m", "pip", "install", "fdb"], capture_output=True)

try:
    import fdb
    
    print(f"Conectando ao Firebird: {DB_PATH}")
    con = fdb.connect(
        host=FB_HOST,
        database=DB_PATH,
        user=FB_USER,
        password=FB_PASS,
        charset='WIN1252'
    )
    
    cur = con.cursor()
    
    # Listar tabelas
    print("\n=== TABELAS DO BANCO ===")
    cur.execute("SELECT TRIM(RDB$RELATION_NAME) FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 ORDER BY RDB$RELATION_NAME")
    tables = [row[0] for row in cur.fetchall()]
    for t in tables[:30]:
        print(t)
    
    # Verificar nome da tabela de pedidos
    pedidos_table = None
    for t in tables:
        if 'PEDIDO' in t.upper() or 'VENDA' in t.upper() or 'NF' in t.upper():
            print(f"\nEncontrada tabela candidata: {t}")
            pedidos_table = t
    
    if pedidos_table:
        print(f"\n=== COLUNAS DE {pedidos_table} ===")
        cur.execute(f"""
            SELECT TRIM(RDB$FIELD_NAME)
            FROM RDB$RELATION_FIELDS
            WHERE RDB$RELATION_NAME = '{pedidos_table}'
            ORDER BY RDB$FIELD_POSITION
        """)
        cols = [row[0] for row in cur.fetchall()]
        print(cols)
    
    cur.close()
    con.close()
    print("\nConexao encerrada.")
    
except Exception as e:
    print(f"\nErro: {e}")
    
    # Tentar sem host (embedded)
    try:
        print("\nTentando embedded...")
        import fdb
        con = fdb.connect(
            database=DB_PATH,
            user=FB_USER,
            password=FB_PASS,
            charset='WIN1252'
        )
        print("Conectado em modo embedded!")
        cur = con.cursor()
        cur.execute("SELECT COUNT(*) FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0")
        print(f"Tabelas: {cur.fetchone()[0]}")
        con.close()
    except Exception as e2:
        print(f"Embedded falhou: {e2}")
