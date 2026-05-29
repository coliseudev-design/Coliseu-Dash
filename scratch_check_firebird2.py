import sys
import subprocess

DB_PATH = r'C:\PROJETOS COLISEU\Bancodedados\DBSISCOM.FDB'

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
    for t in tables[:40]:
        print(t)
    
    # Verificar nome da tabela de pedidos
    pedidos_table = None
    for t in tables:
        if 'PEDIDO' in t.upper() or 'VENDA' in t.upper() or 'NF' in t.upper() or 'SAIDA' in t.upper() or 'SIS' in t.upper():
            print(f"\nEncontrada tabela candidata: {t}")
            pedidos_table = t
            
    cur.close()
    con.close()
    print("\nConexao encerrada.")
    
except Exception as e:
    print(f"\nErro: {e}")
