"""
Testar o rateio do desconto do cabeçalho vs o desconto do item vs o valor da venda.
Vamos entender a relação entre:
1. SUM(itens_brutos) da venda vs valor_total da venda no dash_vendas
2. Por que o rateio deu R$ 35.724,31 para o EUCALIPTO antes, e no ERP deu R$ 34.226,00?
"""
import fdb

DB_PATH = r"C:\Coliseu\DATA\AMAZONIAMADEIRAS.FDB"
con = fdb.connect(dsn=DB_PATH, user='SYSDBA', password='masterkey', charset='WIN1252')
cur = con.cursor()

# Vamos ver todas as vendas de agosto/2026 que têm o produto EUCALIPTO TRATADO 11 A 13 2.7 MT
print("=== VENDAS COM EUCALIPTO TRATADO 11 A 13 2.7 MT EM AGOSTO/2026 ===")
cur.execute("""
    SELECT 
        p.ID_PEDIDO,
        p.DATA_VENCIMENTO,
        p.STATUS,
        p.ID_DEPTO,
        p.DESCONTO AS DESC_PEDIDO,
        pi.VALOR_TOTAL AS BRUTO_ITEM,
        pi.DESCONTO AS DESC_ITEM,
        pi.VALOR_TOTAL * (1 - COALESCE(pi.DESCONTO,0)/100.0) AS LIQUIDO_ITEM_ERP,
        (SELECT SUM(pi2.VALOR_TOTAL) FROM PEDIDO_ITENS pi2 WHERE pi2.ID_PEDIDO = p.ID_PEDIDO) AS SOMA_BRUTO_PEDIDO
    FROM PEDIDO_ITENS pi
    JOIN PEDIDOS p ON p.ID_PEDIDO = pi.ID_PEDIDO
    JOIN PRODUTOS pr ON pr.ID_PRODUTO = pi.ID_PRODUTO
    JOIN NATUREZA_OPERACAO nat ON nat.ID_NATUREZA = p.ID_NATUREZA
    WHERE p.DATA_VENCIMENTO >= CAST('2026-08-01' AS DATE)
      AND p.DATA_VENCIMENTO <= CAST('2026-08-31' AS DATE)
      AND p.STATUS = 2
      AND p.TIPO = 1
      AND p.ID_DEPTO = 1
      AND nat.OPERACAO IN (1, 6, 12)
      AND (nat.PROCESSO <> 3 OR nat.PROCESSO IS NULL)
      AND pr.DESCRICAO = 'EUCALIPTO TRATADO 11 A 13 2.7 MT'
""")
rows = cur.fetchall()
print(f"Total de vendas com este produto: {len(rows)}")
for r in rows:
    print(f"Pedido {r[0]}: Data={r[1]}, DescPed={r[4]}%, BrutoItem={r[5]:.2f}, DescItem={r[6]}%, LiqERP={r[7]:.2f}, SomaBrutoPed={r[8]:.2f}")

con.close()
