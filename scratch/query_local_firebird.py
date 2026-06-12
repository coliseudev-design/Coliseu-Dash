import fdb

databases = [
    r'localhost:C:/Coliseu/Data/PIVETA.FDB',
    r'localhost:C:/Coliseu/Data/KSTRATOR.FDB',
    r'localhost:C:\Mac\Home\Documents\PROJETOS COLISEU\Bancodedados\DBSISCOM.FDB',
    r'localhost:C:\PROJETOS COLISEU\Bancodedados\COMPENSADOSMAMA1203.FDB'
]

for db in databases:
    print(f"Trying to connect to: {db}")
    try:
        conn = fdb.connect(dsn=db, user='SYSDBA', password='masterkey', charset='WIN1252')
        cur = conn.cursor()
        print("Connected! Querying NATUREZA_OPERACAO...")
        cur.execute("SELECT ID_NATUREZA, DESCRICAO, OPERACAO, TIPO, PROCESSO FROM NATUREZA_OPERACAO WHERE ID_NATUREZA = 79 OR DESCRICAO LIKE '%DEVOL%'")
        rows = cur.fetchall()
        for r in rows:
            print(r)
        
        print("\nQuerying PEDIDOS for order 6533...")
        cur.execute("SELECT ID_PEDIDO, TIPO, STATUS, VALOR_PEDIDO, ID_NATUREZA FROM PEDIDOS WHERE ID_PEDIDO = 6533")
        print(cur.fetchall())
        
        cur.close()
        conn.close()
        break
    except Exception as e:
        print(f"Failed: {e}")
