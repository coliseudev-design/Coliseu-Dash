import fdb
conn = fdb.connect(dsn='localhost:C:/Coliseu/Data/PIVETA.FDB', user='SYSDBA', password='masterkey')
c = conn.cursor()
c.execute("SELECT RDB$SYSTEM_FLAG FROM RDB$PROCEDURES WHERE RDB$PROCEDURE_NAME = 'MOB_CADASTRAR_PEDIDO_ITEM'")
print('FLAG:', c.fetchone()[0])
