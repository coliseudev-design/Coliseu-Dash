"""
FASE 1: Alterar VIEW DASH_VENDAS_ITENS no Firebird para incluir desconto_item.
Depois verificar que os dados estão corretos.
"""
import fdb

DB_PATH = r"C:\Coliseu\DATA\AMAZONIAMADEIRAS.FDB"
con = fdb.connect(dsn=DB_PATH, user='SYSDBA', password='masterkey', charset='WIN1252')
cur = con.cursor()

# 1. Alterar a VIEW para incluir desconto_item
print("=== FASE 1: Alterando VIEW DASH_VENDAS_ITENS ===")
try:
    cur.execute("""
        CREATE OR ALTER VIEW DASH_VENDAS_ITENS AS
        SELECT
            ((pi.ID_PEDIDO * 1000) + pi.ID_ITEM)                     AS id_firebird,
            pi.ID_PEDIDO                                             AS venda_id_firebird,
            pi.ID_PRODUTO                                            AS produto_id_firebird,
            (CASE WHEN nat.TIPO = 2 THEN -1 ELSE 1 END) * COALESCE(pi.QTDE, 0) AS quantidade,
            COALESCE(pi.VALOR_UNITARIO, 0)                           AS preco_unitario,
            COALESCE(pi.VALOR_CUSTO, 0)                              AS custo_unitario,
            (CASE WHEN nat.TIPO = 2 THEN -1 ELSE 1 END) * COALESCE(pi.VALOR_TOTAL, 0) AS valor_total,
            COALESCE(pi.DESCONTO, 0)                                 AS desconto_item,
            COALESCE(f.NOME, '')                                     AS vendedor,
            COALESCE(pr.DESCRICAO, '')                               AS produto,
            COALESCE(pr.MARCA, '')                                   AS marca,
            COALESCE(cat.DESCRICAO, '')                              AS categoria,
            p.ID_DEPTO                                               AS depto_id,
            p.ID_NATUREZA                                            AS natureza_id,
            nat.TIPO                                                 AS natureza_tipo,
            nat.PROCESSO                                             AS natureza_processo
        FROM PEDIDO_ITENS pi
        JOIN PEDIDOS p ON p.ID_PEDIDO = pi.ID_PEDIDO
        LEFT JOIN PRODUTOS pr ON pr.ID_PRODUTO = pi.ID_PRODUTO
        LEFT JOIN CATEGORIAS cat ON cat.ID_CATEGORIA = pr.ID_CATEGORIA
        LEFT JOIN FUNCIONARIOS f ON f.ID_FUNCIONARIO = p.ID_VENDEDOR
        LEFT JOIN NATUREZA_OPERACAO nat ON nat.ID_NATUREZA = p.ID_NATUREZA
        WHERE p.STATUS IN (0, 1, 2, 9)
          AND p.TIPO = 1
          AND nat.OPERACAO IN (1, 6, 12)
          AND (nat.PROCESSO <> 3 OR nat.PROCESSO IS NULL)
    """)
    con.commit()
    print("  ✅ VIEW alterada com sucesso!")
except Exception as e:
    print(f"  ❌ Erro: {e}")
    con.rollback()

# 2. Verificar que o campo existe
print("\n=== Verificando colunas da VIEW ===")
cur.execute("""
    SELECT TRIM(RF.RDB$FIELD_NAME) FROM RDB$RELATION_FIELDS RF
    WHERE RF.RDB$RELATION_NAME = 'DASH_VENDAS_ITENS'
    ORDER BY RF.RDB$FIELD_POSITION
""")
for r in cur.fetchall():
    marker = " ← NOVO!" if r[0] == 'DESCONTO_ITEM' else ""
    print(f"  {r[0]}{marker}")

# 3. Verificar dados de amostra
print("\n=== Amostra com desconto_item ===")
cur.execute("""
    SELECT FIRST 5
        VENDA_ID_FIREBIRD, PRODUTO, VALOR_TOTAL, DESCONTO_ITEM,
        VALOR_TOTAL * (1 - DESCONTO_ITEM / 100.0) AS VALOR_LIQUIDO
    FROM DASH_VENDAS_ITENS
    WHERE VENDA_ID_FIREBIRD = 680881
    ORDER BY VALOR_TOTAL DESC
""")
print(f"  {'PED':>8} {'PRODUTO':>35} {'BRUTO':>12} {'DESC%':>7} {'LIQUIDO':>12}")
for r in cur.fetchall():
    print(f"  {r[0]:>8} {str(r[1])[:35]:>35} {float(r[2]):>12.2f} {float(r[3]):>7.1f} {float(r[4]):>12.2f}")

# 4. Calcular ranking CORRETO com desconto_item e verificar vs ERP
print("\n=== RANKING com desconto_item — DEPTO 1, Ago/2026 ===")
cur.execute("""
    SELECT FIRST 10
        DVI.PRODUTO,
        SUM(ABS(DVI.VALOR_TOTAL) * (1 - COALESCE(DVI.DESCONTO_ITEM, 0) / 100.0)
            * (CASE WHEN DVI.VALOR_TOTAL < 0 THEN -1 ELSE 1 END)) AS TOTAL,
        SUM(DVI.QUANTIDADE) AS QTD
    FROM DASH_VENDAS_ITENS DVI
    JOIN DASH_VENDAS DV ON DV.ID_FIREBIRD = DVI.VENDA_ID_FIREBIRD
    WHERE DV.DATA_HORA_PROC >= CAST('2026-08-01' AS DATE)
      AND DV.DATA_HORA_PROC <= CAST('2026-08-31' AS DATE)
      AND DV.NATUREZA_PROCESSO IN (1, 2)
      AND DV.STATUS <> 'CANCELADO'
      AND DV.DEPTO_ID = 1
    GROUP BY DVI.PRODUTO
    ORDER BY 2 DESC
""")
rows = cur.fetchall()
erp = {
    "EUCALIPTO TRATADO 11 A 13 2.7 MT": 34226.00,
    "TABUA CEDRINHO MESCLA 2,3 X 15,0": 31616.79,
    "TABUA PINUS 30,0CM MIX": 29023.85,
    "VIGA CAMBARA SIMILAR 4,5 X 10,0": 27819.45,
    "TABUA CEDRINHO MESCLA 2,3 X 30,0": 26457.04,
    "QUADRADO PEROBA CUPIUBA 20,0 X 20,0": 18056.62,
    "VIGOTA PEROBA CUPIUBA 4,5 X 15,0": 16428.45,
}
print(f"  {'#':>3} {'PRODUTO':<42} {'TOTAL':>12} {'ERP':>12} {'MATCH':>6}")
print("  " + "-" * 80)
for i, r in enumerate(rows, 1):
    prod = str(r[0]).strip()
    total = float(r[1])
    erp_val = erp.get(prod, 0)
    match = " ✓" if erp_val > 0 and abs(total - erp_val) < 2 else (" ✗" if erp_val > 0 else "")
    erp_s = f"{erp_val:>12,.2f}" if erp_val > 0 else ""
    print(f"  {i:>3} {prod[:42]:<42} {total:>12,.2f} {erp_s:>12}{match}")

con.close()
