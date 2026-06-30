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
    
    # 1. Structure of PEDIDOS_VENDEDOR
    print("\n=== 1. Structure of PEDIDOS_VENDEDOR ===")
    cur.execute("""
        SELECT
            TRIM(rf.RDB$FIELD_NAME) AS field_name,
            f.RDB$FIELD_TYPE AS field_type,
            f.RDB$FIELD_LENGTH AS field_length
        FROM
            RDB$RELATION_FIELDS rf
            JOIN RDB$FIELDS f ON rf.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME
        WHERE
            rf.RDB$RELATION_NAME = 'PEDIDOS_VENDEDOR'
        ORDER BY
            rf.RDB$FIELD_POSITION
    """)
    for row in cur.fetchall():
        print(f"Col: {row[0]} (Type: {row[1]}, Len: {row[2]})")
        
    # 2. Get first 5 rows of PEDIDOS_VENDEDOR
    print("\n=== 2. Sample rows from PEDIDOS_VENDEDOR ===")
    try:
        cur.execute("SELECT FIRST 10 * FROM PEDIDOS_VENDEDOR")
        cols = [col[0] for col in cur.description]
        print(cols)
        for row in cur.fetchall():
            print(row)
    except Exception as e:
        print("Error querying PEDIDOS_VENDEDOR:", e)
        
    # 3. Check values of COMISSAO_TIPO and other comissao configs in CONFIG table
    print("\n=== 3. Comissao configuration in CONFIG table ===")
    try:
        cur.execute("SELECT COMISSAO_TIPO, MODELO_COMISSAO, COMISSAO_MODELO, TITULO_COMISSAO FROM CONFIG")
        cols = [col[0] for col in cur.description]
        print(cols)
        for row in cur.fetchall():
            print(row)
    except Exception as e:
        print("Error querying CONFIG table:", e)
        
    cur.close()
    con.close()
except Exception as e:
    print(f"Error: {e}")
