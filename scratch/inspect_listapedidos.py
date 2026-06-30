import fdb

db_path = r'C:\Coliseu\Data\PIVETA.FDB'
try:
    con = fdb.connect(
        host='localhost',
        database=db_path,
        user='SYSDBA',
        password='masterkey',
        charset='WIN1252'
    )
    cur = con.cursor()
    
    cur.execute("SELECT RDB$RELATION_NAME, RDB$VIEW_SOURCE FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'LISTAPEDIDOS'")
    row = cur.fetchone()
    if row:
        print("LISTAPEDIDOS is a relation.")
        if row[1] is not None:
            print("LISTAPEDIDOS is a VIEW! Definition:")
            print(row[1])
        else:
            print("LISTAPEDIDOS is a TABLE.")
    else:
        print("LISTAPEDIDOS relation NOT found.")
        
    cur.close()
    con.close()
except Exception as e:
    print(f"Error: {e}")
