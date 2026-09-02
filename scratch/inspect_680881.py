"""
Inspecionar todos os detalhes do Pedido 680881 no Firebird.
"""
import fdb

DB_PATH = r"C:\Coliseu\DATA\AMAZONIAMADEIRAS.FDB"
con = fdb.connect(dsn=DB_PATH, user='SYSDBA', password='masterkey', charset='WIN1252')
cur = con.cursor()

print("=== PEDIDO 680881 (DASH_VENDAS) ===")
cur.execute("""
    SELECT ID_FIREBIRD, VALOR_TOTAL, VALOR_DESCONTO, STATUS, ESPECIE
    FROM DASH_VENDAS
    WHERE ID_FIREBIRD = 680881
""")
cols = [d[0] for d in cur.description]
row = cur.fetchone()
for c, v in zip(cols, row):
    print(f"  {c}: {v}")

print("\n=== ITENS DO PEDIDO 680881 (PEDIDO_ITENS) ===")
cur.execute("""
    SELECT pi.ID_ITEM, pr.DESCRICAO, pi.QTDE, pi.VALOR_UNITARIO, pi.VALOR_TOTAL, pi.DESCONTO,
           pi.VALOR_TOTAL * (1 - COALESCE(pi.DESCONTO,0)/100.0) AS LIQ_ITEM
    FROM PEDIDO_ITENS pi
    JOIN PRODUTOS pr ON pr.ID_PRODUTO = pi.ID_PRODUTO
    WHERE pi.ID_PEDIDO = 680881
""")
total_bruto = 0
total_liq = 0
for r in cur.fetchall():
    print(f"  Item {r[0]}: {r[1][:30]:30} | Qtd={r[2]:6.1f} | Unit={r[3]:8.2f} | Bruto={r[4]:10.2f} | Desc={r[5]:5.1f}% | Liq={r[6]:10.2f}")
    total_bruto += r[4]
    total_liq += r[6]
print(f"  TOTAL BRUTO ITENS: {total_bruto:.2f}")
print(f"  TOTAL LIQUIDO ITENS: {total_liq:.2f}")

con.close()
