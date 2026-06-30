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
    
    views = ['L_VENDAS_VENDEDOR', 'REL_IC_COMISSAO_VAR1', 'REL_IC_COMISSAO_VAR2', 'REL_IC_COMISSAO_VAR3']
    for v in views:
        cur.execute(f"SELECT RDB$VIEW_SOURCE FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = '{v}'")
        row = cur.fetchone()
        print(f"\n================ {v} ================")
        if row and row[0]:
            print(row[0])
        else:
            print("Not found or no source.")
            
    cur.close()
    con.close()
except Exception as e:
    print(f"Error: {e}")
