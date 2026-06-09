import fdb

DB_PATH = r'C:\Coliseu\Data\PIVETA.FDB'

try:
    con = fdb.connect(
        host='localhost',
        database=DB_PATH,
        user='SYSDBA',
        password='masterkey',
        charset='WIN1252'
    )
    print("Connected successfully to PIVETA.FDB!")
    cur = con.cursor()
    
    # 1. Check if DASH_VENDAS exists and row count
    try:
        cur.execute("SELECT COUNT(*) FROM DASH_VENDAS")
        print(f"Total rows in DASH_VENDAS: {cur.fetchone()[0]}")
    except Exception as e:
        print(f"Error querying DASH_VENDAS: {e}")

    # 2. Check if DASH_VENDAS_ITENS exists and row count
    try:
        cur.execute("SELECT COUNT(*) FROM DASH_VENDAS_ITENS")
        print(f"Total rows in DASH_VENDAS_ITENS: {cur.fetchone()[0]}")
    except Exception as e:
        print(f"Error querying DASH_VENDAS_ITENS: {e}")

    # 3. Select first 5 rows from DASH_VENDAS
    try:
        cur.execute("SELECT FIRST 5 * FROM DASH_VENDAS")
        print("\n=== First 5 rows in DASH_VENDAS ===")
        # Get column names
        cols = [col[0] for col in cur.description]
        print(cols)
        for row in cur.fetchall():
            print(row)
    except Exception as e:
        print(f"Error selecting from DASH_VENDAS: {e}")

    # 4. Check if there are sales in 2026
    try:
        cur.execute("SELECT COUNT(*) FROM DASH_VENDAS WHERE DATA_VENDA >= '2026-01-01'")
        print(f"Total rows in DASH_VENDAS in 2026: {cur.fetchone()[0]}")
    except Exception as e:
        print(f"Error checking 2026 sales: {e}")

    cur.close()
    con.close()
except Exception as e:
    print(f"Connection error: {e}")
