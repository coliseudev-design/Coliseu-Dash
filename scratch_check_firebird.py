import fdb

DB_PATH = r'C:\PROJETOS COLISEU\Bancodedados\DBSISCOM.FDB'

con = fdb.connect(
    host='localhost',
    database=DB_PATH,
    user='SYSDBA',
    password='masterkey',
    charset='WIN1252'
)

cur = con.cursor()

cur.execute("SELECT COUNT(*) FROM TBNOTASSAIDA WHERE COMDEMPRESA = 1" if False else "SELECT COUNT(*) FROM TBNOTASSAIDA")
print(f"Total rows in TBNOTASSAIDA: {cur.fetchone()[0]}")

cur.close()
con.close()
