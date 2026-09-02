"""
Testar envio direto das vendas e itens de DASH_VENDAS_ITENS do Firebird local
para a API do middleware em produção usando a chave de API do tenant da Amazônia Madeiras!
"""
import urllib.request
import json
import ssl
import fdb

# 1. Descobrir as credenciais de API para a Amazônia Madeiras
# Vamos verificar os arquivos de configuração do Worker ou banco SQLite
DB_PATH = r"C:\Coliseu\DATA\AMAZONIAMADEIRAS.FDB"
con = fdb.connect(dsn=DB_PATH, user='SYSDBA', password='masterkey', charset='WIN1252')
cur = con.cursor()

cur.execute("""
    SELECT COUNT(*) FROM DASH_VENDAS_ITENS
""")
total_itens = cur.fetchone()[0]
print(f"Total de itens na view DASH_VENDAS_ITENS do Firebird: {total_itens}")

# Pegar uma amostra de 5 itens com desconto_item
cur.execute("""
    SELECT FIRST 5 ID_FIREBIRD, VENDA_ID_FIREBIRD, PRODUTO, VALOR_TOTAL, DESCONTO_ITEM
    FROM DASH_VENDAS_ITENS
    WHERE DESCONTO_ITEM > 0
""")
for r in cur.fetchall():
    print(f"  Item {r[0]}: Venda={r[1]}, Prod={r[2][:30]}, VT={r[3]}, DescItem={r[4]}")

con.close()
