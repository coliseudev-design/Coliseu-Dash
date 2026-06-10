import fdb
import sys
sys.stdout.reconfigure(encoding='utf-8')

dsn = 'localhost:C:/Coliseu/Data/PIVETA.FDB'
user = 'SYSDBA'
password = 'masterkey'

sql_recreate_view = """
RECREATE VIEW DASH_VENDAS (
    ID_FIREBIRD,
    NUMERO_PEDIDO,
    DATA_VENDA,
    CLIENTE_ID_FIREBIRD,
    VENDEDOR_ID_FIREBIRD,
    VALOR_TOTAL,
    VALOR_CUSTO,
    VALOR_DESCONTO,
    STATUS,
    MARCA,
    CATEGORIA,
    ESPECIE,
    DEPTO_ID,
    DATA_VENCIMENTO,
    DATA_HORA_PROC
) AS
SELECT
    p.ID_PEDIDO                                              AS id_firebird,
    CAST(p.ID_PEDIDO AS VARCHAR(20))                         AS numero_pedido,
    CAST(p.DATA_HORA AS DATE)                                AS data_venda,
    p.ID_CLIENTE                                             AS cliente_id_firebird,
    p.ID_VENDEDOR                                            AS vendedor_id_firebird,
    MAX(COALESCE(p.VALOR_PEDIDO, 0) + COALESCE(p.VALOR_FRETE, 0) + COALESCE(p.OUTRAS_DESPESAS, 0) + COALESCE(p.VALOR_ACRESCIMO, 0) + COALESCE(p.VALOR_IPI, 0) + COALESCE(p.VALOR_ICMS_SUB, 0) - COALESCE(p.VALOR_DESCONTO, 0)) AS valor_total,
    COALESCE(SUM(pi.VALOR_CUSTO), 0)                         AS valor_custo,
    MAX(COALESCE(p.VALOR_DESCONTO, 0))                       AS valor_desconto,
    CASE p.STATUS 
        WHEN 0 THEN 'ABERTO'
        WHEN 1 THEN 'ABERTO'
        WHEN 9 THEN 'CANCELADO' 
        ELSE 'FATURADO' 
    END                                                      AS status,
    MAX(COALESCE(pr.MARCA, ''))                              AS marca,
    MAX(COALESCE(cat.DESCRICAO, ''))                         AS categoria,
    MAX(COALESCE(esp.DESCRICAO, 'Não Informada'))            AS especie,
    p.ID_DEPTO                                               AS depto_id,
    p.DATA_VENCIMENTO                                        AS data_vencimento,
    p.DATA_HORA_PROC                                         AS data_hora_proc
FROM PEDIDOS p
JOIN PEDIDO_ITENS pi ON pi.ID_PEDIDO = p.ID_PEDIDO
LEFT JOIN PRODUTOS pr ON pr.ID_PRODUTO = pi.ID_PRODUTO
LEFT JOIN CATEGORIAS cat ON cat.ID_CATEGORIA = pr.ID_CATEGORIA
LEFT JOIN PEDIDOS_DOCS pd ON pd.ID_PEDIDO = p.ID_PEDIDO
LEFT JOIN ESPECIE_PGTO esp ON esp.ID_ESPECIE = pd.ID_ESPECIE
LEFT JOIN NATUREZA_OPERACAO nat ON nat.ID_NATUREZA = p.ID_NATUREZA
WHERE p.STATUS IN (0, 1, 2, 9)
  AND p.TIPO = 1
  AND nat.OPERACAO IN (1, 6, 12)
  AND (nat.TIPO <> 2 OR nat.TIPO IS NULL)
  AND (nat.PROCESSO <> 3 OR nat.PROCESSO IS NULL)
GROUP BY p.ID_PEDIDO, p.DATA_HORA, p.ID_CLIENTE, p.ID_VENDEDOR, p.STATUS, p.ID_DEPTO, p.DATA_VENCIMENTO, p.DATA_HORA_PROC
"""

try:
    print(f"Connecting to Firebird: {dsn}...")
    con = fdb.connect(dsn=dsn, user=user, password=password, charset='WIN1252')
    con.begin()
    cur = con.cursor()
    
    print("Executing RECREATE VIEW DASH_VENDAS...")
    cur.execute(sql_recreate_view)
    con.commit()
    print("SUCCESS: View DASH_VENDAS recreated successfully with DATA_VENCIMENTO and DATA_HORA_PROC!")
    
    # Verify the new columns exist in the view
    cur.execute("SELECT FIRST 1 * FROM DASH_VENDAS")
    cols = [col[0] for col in cur.description]
    print("New view columns:", cols)
    
    cur.close()
    con.close()
except Exception as e:
    print("ERROR altering view:", e)
