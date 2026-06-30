import fdb
import sys

db_path = r'C:\Coliseu\Data\PIVETA.FDB'
print(f"Connecting to Firebird: {db_path} ...")

try:
    con = fdb.connect(
        host='localhost',
        database=db_path,
        user='SYSDBA',
        password='masterkey',
        charset='WIN1252'
    )
    print("Connected successfully!")
    cur = con.cursor()
    
    # 1. Search for View L_VENDAS_VENDEDOR_VAR
    print("\n=== 1. Checking view L_VENDAS_VENDEDOR_VAR ===")
    cur.execute("SELECT RDB$RELATION_NAME, RDB$VIEW_SOURCE FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'L_VENDAS_VENDEDOR_VAR'")
    row = cur.fetchone()
    if row:
        print("View L_VENDAS_VENDEDOR_VAR exists!")
        print("View definition (Source):")
        print(row[1])
    else:
        print("View L_VENDAS_VENDEDOR_VAR NOT found!")
        # Let's search for similar names
        cur.execute("SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME LIKE '%VENDEDOR%' OR RDB$RELATION_NAME LIKE '%COMISSAO%'")
        similar = cur.fetchall()
        print("Similar relations:")
        for s in similar:
            print(s[0].strip())
            
    # 2. Let's get columns of L_VENDAS_VENDEDOR_VAR if it exists
    print("\n=== 2. Getting columns of L_VENDAS_VENDEDOR_VAR ===")
    try:
        cur.execute("""
            SELECT
                TRIM(rf.RDB$FIELD_NAME) AS field_name,
                f.RDB$FIELD_TYPE AS field_type,
                f.RDB$FIELD_LENGTH AS field_length
            FROM
                RDB$RELATION_FIELDS rf
                JOIN RDB$FIELDS f ON rf.RDB$FIELD_SOURCE = f.RDB$FIELD_NAME
            WHERE
                rf.RDB$RELATION_NAME = 'L_VENDAS_VENDEDOR_VAR'
            ORDER BY
                rf.RDB$FIELD_POSITION
        """)
        cols = cur.fetchall()
        for c in cols:
            print(f"Col: {c[0]} (Type: {c[1]}, Len: {c[2]})")
    except Exception as e:
        print(f"Error reading columns of L_VENDAS_VENDEDOR_VAR: {e}")
        
    # 3. Find parameters in CONFIG or similar tables
    print("\n=== 3. Searching for config tables ===")
    cur.execute("SELECT TRIM(RDB$RELATION_NAME) FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND (RDB$RELATION_NAME LIKE '%CONFIG%' OR RDB$RELATION_NAME LIKE '%PARAM%') ORDER BY RDB$RELATION_NAME")
    config_tables = cur.fetchall()
    print("Found config tables:")
    for ct in config_tables:
        print(ct[0])
        
    # For each config table, let's search for columns like 'COMISSAO'
    for ct in config_tables:
        tname = ct[0]
        try:
            cur.execute(f"""
                SELECT TRIM(rf.RDB$FIELD_NAME)
                FROM RDB$RELATION_FIELDS rf
                WHERE rf.RDB$RELATION_NAME = '{tname}'
                  AND (rf.RDB$FIELD_NAME LIKE '%COMIS%' OR rf.RDB$FIELD_NAME LIKE '%TIPO%')
            """)
            matching_cols = cur.fetchall()
            if matching_cols:
                print(f"\nTable {tname} has matching columns:")
                for mc in matching_cols:
                    col_name = mc[0]
                    print(f"  - {col_name}")
                    # Try to query the values from this column
                    try:
                        cur.execute(f"SELECT FIRST 5 {col_name} FROM {tname}")
                        vals = cur.fetchall()
                        print(f"    Values: {vals}")
                    except Exception as val_err:
                        print(f"    Could not select values: {val_err}")
        except Exception as col_err:
            pass

    cur.close()
    con.close()
except Exception as e:
    print(f"Error: {e}")
