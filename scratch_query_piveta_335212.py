import fdb
import sys
sys.stdout.reconfigure(encoding='utf-8')

dsn = 'localhost:C:/Coliseu/Data/PIVETA.FDB'
user = 'SYSDBA'
password = 'masterkey'

try:
    print(f"Connecting to Firebird using dsn: {dsn}...")
    con = fdb.connect(dsn=dsn, user=user, password=password, charset='WIN1252')
    cur = con.cursor()
    
    # Query view source for DASH_VENDAS
    print("\n--- VIEW SOURCE FOR DASH_VENDAS ---")
    try:
        cur.execute("SELECT RDB$VIEW_SOURCE FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'DASH_VENDAS'")
        row = cur.fetchone()
        if row:
            print(row[0])
        else:
            print("View DASH_VENDAS not found.")
    except Exception as e:
        print("Error getting view source:", e)

    # Query view source for DASH_VENDAS_ITENS
    print("\n--- VIEW SOURCE FOR DASH_VENDAS_ITENS ---")
    try:
        cur.execute("SELECT RDB$VIEW_SOURCE FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'DASH_VENDAS_ITENS'")
        row = cur.fetchone()
        if row:
            print(row[0])
        else:
            print("View DASH_VENDAS_ITENS not found.")
    except Exception as e:
        print("Error getting view source:", e)

    cur.close()
    con.close()
except Exception as e:
    print("Connection failed:", e)
