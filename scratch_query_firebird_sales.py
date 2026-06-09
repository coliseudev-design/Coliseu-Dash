import fdb
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Coliseu\Data\PIVETA.FDB"
user = "SYSDBA"
password = "masterkey"

try:
    print(f"Connecting to Firebird: {db_path}...")
    con = fdb.connect(host='localhost', database=db_path, user=user, password=password, charset='WIN1252')
    cur = con.cursor()
    
    # Check if COLISEU_SYNC_LOG exists and what is in it
    try:
        cur.execute("SELECT FIRST 5 * FROM COLISEU_SYNC_LOG")
        rows = cur.fetchall()
        print("\n=== COLISEU_SYNC_LOG Sample ===")
        for r in rows:
            print(r)
    except Exception as e:
        print("\nCOLISEU_SYNC_LOG check failed:", e)

    # List sales-related tables
    try:
        cur.execute("SELECT TRIM(RDB$RELATION_NAME) FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 ORDER BY RDB$RELATION_NAME")
        tables = [row[0] for row in cur.fetchall()]
        print("\n=== Candidate Tables in Firebird ===")
        for t in tables:
            if any(k in t.upper() for k in ['NOTA', 'VENDA', 'SAIDA', 'PEDIDO', 'FATUR', 'CUPOM']):
                print(t)
    except Exception as e:
        print("\nFailed to list tables:", e)
        
    cur.close()
    con.close()
    print("\nConnection closed successfully.")
except Exception as e:
    print("\nConnection failed:", e)
