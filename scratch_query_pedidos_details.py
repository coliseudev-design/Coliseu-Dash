import fdb
import sys

sys.stdout.reconfigure(encoding='utf-8')

db_path = r"C:\Coliseu\Data\PIVETA.FDB"
user = "SYSDBA"
password = "masterkey"

try:
    con = fdb.connect(host='localhost', database=db_path, user=user, password=password, charset='WIN1252')
    cur = con.cursor()
    
    # Query column names of PEDIDOS table
    cur.execute("SELECT FIRST 1 * FROM PEDIDOS")
    cur.fetchall()
    columns = [col[0] for col in cur.description]
    print("=== Columns in PEDIDOS ===")
    print(columns)
    
    # Query sample rows
    print("\n=== Sample Rows from PEDIDOS ===")
    cur.execute("SELECT FIRST 5 * FROM PEDIDOS")
    for r in cur.fetchall():
        print(r)
        
    cur.close()
    con.close()
except Exception as e:
    print("Error:", e)
