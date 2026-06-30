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
    
    # Search for all relations containing COMISSAO or VENDEDOR or FUNC
    cur.execute("""
        SELECT TRIM(RDB$RELATION_NAME), RDB$VIEW_SOURCE 
        FROM RDB$RELATIONS 
        WHERE RDB$SYSTEM_FLAG = 0 
          AND (RDB$RELATION_NAME LIKE '%COMIS%' OR RDB$RELATION_NAME LIKE '%VENDEDOR%' OR RDB$RELATION_NAME LIKE '%FUNC%')
        ORDER BY RDB$RELATION_NAME
    """)
    rows = cur.fetchall()
    print("Found relations:")
    for r in rows:
        is_view = r[1] is not None
        print(f"- {r[0]} ({'VIEW' if is_view else 'TABLE'})")
        
    cur.close()
    con.close()
except Exception as e:
    print(f"Error: {e}")
