import fdb

DB = r'C:\Mac\Home\Documents\PROJETOS COLISEU\Bancodedados\DBSISCOM.FDB'

def q(label, sql, params=None):
    con = fdb.connect(host='localhost', database=DB, user='SYSDBA', password='masterkey', charset='WIN1252')
    try:
        cur = con.cursor()
        if params:
            cur.execute(sql, params)
        else:
            cur.execute(sql)
        rows = cur.fetchall()
        print(f"\n=== {label} ===")
        for r in rows:
            print(r)
        if not rows:
            print("(sem resultados)")
    except Exception as e:
        print(f"\n=== {label} ===\nERRO: {e}")
    finally:
        con.close()

# Listar tabelas candidatas
q("TABELAS DO BANCO", 
  "SELECT TRIM(RDB$RELATION_NAME) FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$VIEW_BLR IS NULL ORDER BY RDB$RELATION_NAME")
