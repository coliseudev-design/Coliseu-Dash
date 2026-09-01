"""
FIREBIRD v11 - Verificar se SUM(valor_total) ou SUM(valor_total - valor_desconto) 
da VIEW DASH_VENDAS bate com R$ 475.944,99 (usando filtros corretos).
"""
import fdb

DB_PATH = r"C:\Coliseu\DATA\AMAZONIAMADEIRAS.FDB"
con = fdb.connect(dsn=DB_PATH, user='SYSDBA', password='masterkey', charset='WIN1252')
cur = con.cursor()
print("=== FIREBIRD v11 - QUAL TOTAL BATE COM R$ 475.944,99? ===\n")

# 1. SEM filtro de depto — o Worker envia TUDO, o Dashboard filtra depois
# Mas este é o banco AMAZONIAMADEIRAS, que pode ter todos os deptos

# DEPTO 1 (AMAZONIA MADEIRAS - MATRIZ)
for depto in [None, 1, 2, 3]:
    depto_filter = f"AND DEPTO_ID = {depto}" if depto else ""
    depto_name = f"DEPTO {depto}" if depto else "TODOS"
    
    cur.execute(f"""
        SELECT 
            SUM(VALOR_TOTAL) AS SUM_VT,
            SUM(VALOR_TOTAL - COALESCE(VALOR_DESCONTO, 0)) AS SUM_VT_MINUS_DESC,
            SUM(COALESCE(VALOR_DESCONTO, 0)) AS SUM_DESC,
            COUNT(*) AS QTD
        FROM DASH_VENDAS
        WHERE DATA_HORA_PROC >= CAST('2026-08-01' AS DATE)
          AND DATA_HORA_PROC <= CAST('2026-08-31' AS DATE)
          AND NATUREZA_PROCESSO IN (1, 2)
          {depto_filter}
    """)
    r = cur.fetchone()
    print(f"  {depto_name:>8}: SUM(VT)={r[0]:>14,.2f}  SUM(VT-DESC)={r[1]:>14,.2f}  SUM(DESC)={r[2]:>14,.2f}  QTD={r[3]}")
    
    # Verificar se algum coincide com 475944.99
    for label, val in [("SUM(VT)", r[0]), ("SUM(VT-DESC)", r[1])]:
        if abs(val - 475944.99) < 5:
            print(f"    *** MATCH! {label} ≈ R$ 475.944,99 ***")

# 2. Filtrar também por STATUS (somente FATURADO, excluindo CANCELADO)
print("\n=== COM FILTRO DE STATUS ===")
for status_filter in [
    "AND STATUS = 'FATURADO'", 
    "AND STATUS <> 'CANCELADO'",
    ""
]:
    for depto in [None, 1]:
        depto_filter = f"AND DEPTO_ID = {depto}" if depto else ""
        depto_name = f"DEPTO {depto}" if depto else "TODOS"
        
        cur.execute(f"""
            SELECT 
                SUM(VALOR_TOTAL),
                SUM(VALOR_TOTAL - COALESCE(VALOR_DESCONTO, 0)),
                COUNT(*)
            FROM DASH_VENDAS
            WHERE DATA_HORA_PROC >= CAST('2026-08-01' AS DATE)
              AND DATA_HORA_PROC <= CAST('2026-08-31' AS DATE)
              AND NATUREZA_PROCESSO IN (1, 2)
              {depto_filter}
              {status_filter}
        """)
        r = cur.fetchone()
        sf = status_filter.replace("AND ", "").strip() or "ALL STATUS"
        match_vt = " ← MATCH VT!" if r[0] and abs(r[0] - 475944.99) < 5 else ""
        match_vtd = " ← MATCH VT-D!" if r[1] and abs(r[1] - 475944.99) < 5 else ""
        print(f"  {depto_name:>8} {sf:>25}: VT={r[0]:>14,.2f}  VT-D={r[1]:>14,.2f}  n={r[2]}{match_vt}{match_vtd}")

# 3. E agora o mais importante: o middleware tem campo `processo` que pode ser mapeado de `natureza_processo`
# O Worker pode filtrar de forma diferente. Verificar se existe coluna `processo` separada na VIEW
print("\n=== COLUNAS DA VIEW DASH_VENDAS ===")
cur.execute("""
    SELECT TRIM(RF.RDB$FIELD_NAME)
    FROM RDB$RELATION_FIELDS RF
    WHERE RF.RDB$RELATION_NAME = 'DASH_VENDAS'
    ORDER BY RF.RDB$FIELD_POSITION
""")
for r in cur.fetchall():
    print(f"  {r[0]}")

# 4. O middleware filtra por `v.processo IN (1, 2)` — verificar se isso mapeia para NATUREZA_PROCESSO
# A VIEW tem NATUREZA_PROCESSO como nome da coluna
# O TABELAS_MAP mapeia para `processo` na tabela PostgreSQL

# 5. Verificar se existe filtro de CFOP no middleware (salesFilter)
print("\n=== VERIFICAR CFOP: o middleware tem cfopUtil.getSalesFilterClause ===")
# O salesFilter exclui CFOP específicos. Verificar quantas vendas seriam excluídas
# Não sei quais CFOPs o middleware filtra, mas a VIEW não tem CFOP...

# 6. Contagem SEM filtro de natureza_processo
print("\n=== SEM FILTRO DE PROCESSO ===")
for depto in [None, 1]:
    depto_filter = f"AND DEPTO_ID = {depto}" if depto else ""
    depto_name = f"DEPTO {depto}" if depto else "TODOS"
    cur.execute(f"""
        SELECT SUM(VALOR_TOTAL), SUM(VALOR_TOTAL - COALESCE(VALOR_DESCONTO, 0)), COUNT(*)
        FROM DASH_VENDAS
        WHERE DATA_HORA_PROC >= CAST('2026-08-01' AS DATE)
          AND DATA_HORA_PROC <= CAST('2026-08-31' AS DATE)
          AND STATUS <> 'CANCELADO'
          {depto_filter}
    """)
    r = cur.fetchone()
    match = " ← MATCH!" if r[0] and abs(r[0] - 475944.99) < 5 else ""
    match2 = " ← MATCH!" if r[1] and abs(r[1] - 475944.99) < 5 else ""
    print(f"  {depto_name}: VT={r[0]:>14,.2f}{match}  VT-D={r[1]:>14,.2f}{match2}  n={r[2]}")

con.close()
