"""
Analisar exatamente o que está acontecendo:
1. Sincronização do Worker: como o Worker sincroniza dash_vendas_itens?
2. O que acontece com os dados históricos no PostgreSQL?
3. Se o Worker só sincroniza vendas recentes/alteradas, o histórico antigo nunca recebe desconto_item a menos que haja um full sync ou o cálculo use o que já existe.
"""
import fdb

DB_PATH = r"C:\Coliseu\DATA\AMAZONIAMADEIRAS.FDB"
con = fdb.connect(dsn=DB_PATH, user='SYSDBA', password='masterkey', charset='WIN1252')
cur = con.cursor()

# Verificar os descontos dos itens e pedidos de agosto de 2026
print("=== VERIFICANDO PEDIDOS E ITENS DE AGOSTO/2026 ===")
cur.execute("""
    SELECT COUNT(*), 
           SUM(pi.VALOR_TOTAL),
           SUM(pi.VALOR_TOTAL * (1 - COALESCE(pi.DESCONTO, 0)/100.0))
    FROM PEDIDO_ITENS pi
    JOIN PEDIDOS p ON p.ID_PEDIDO = pi.ID_PEDIDO
    JOIN NATUREZA_OPERACAO nat ON nat.ID_NATUREZA = p.ID_NATUREZA
    WHERE p.DATA_VENCIMENTO >= CAST('2026-08-01' AS DATE)
      AND p.DATA_VENCIMENTO <= CAST('2026-08-31' AS DATE)
      AND p.STATUS IN (0, 1, 2, 9)
      AND p.TIPO = 1
      AND p.ID_DEPTO = 1
      AND nat.OPERACAO IN (1, 6, 12)
      AND (nat.PROCESSO <> 3 OR nat.PROCESSO IS NULL)
""")
r = cur.fetchone()
print(f"Total Itens: {r[0]}")
print(f"Soma Bruto Itens: R$ {r[1]:,.2f}")
print(f"Soma Líquido Itens (com pi.DESCONTO): R$ {r[2]:,.2f}")

con.close()
