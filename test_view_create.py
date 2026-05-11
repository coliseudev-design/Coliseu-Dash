import fdb
conn = fdb.connect(dsn='localhost:C:/Coliseu/Data/PIVETA.FDB', user='SYSDBA', password='masterkey')
c = conn.cursor()
sql = """
CREATE OR ALTER VIEW DASH_VENDAS AS
            SELECT
                p.ID_PEDIDO                                              AS id_firebird,
                CAST(p.ID_PEDIDO AS VARCHAR(20))                         AS numero_pedido,
                CAST(p.DATA_HORA AS DATE)                                AS data_venda,
                p.ID_CLIENTE                                             AS cliente_id_firebird,
                p.ID_VENDEDOR                                            AS vendedor_id_firebird,
                MAX(COALESCE(p.VALOR_PEDIDO, 0) + COALESCE(p.VALOR_FRETE, 0) + COALESCE(p.OUTRAS_DESPESAS, 0) + COALESCE(p.VALOR_ACRESCIMO, 0) - COALESCE(p.VALOR_DESCONTO, 0)) AS valor_total,
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
                MAX(COALESCE(esp.DESCRICAO, 'Nao Informada'))            AS especie
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
            GROUP BY p.ID_PEDIDO, p.DATA_HORA, p.ID_CLIENTE, p.ID_VENDEDOR, p.STATUS
"""
try:
    c.execute(sql)
    conn.commit()
    print("View criada com sucesso.")
except Exception as e:
    print("ERRO:", e)
