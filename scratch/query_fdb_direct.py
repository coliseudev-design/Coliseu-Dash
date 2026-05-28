import fdb

# Connect directly to the local Firebird file
# We use the local path: /Users/kleber/Documents/PROJETOS COLISEU/Bancodedados/DBSISCOM.FDB
db_path = "/Users/kleber/Documents/PROJETOS COLISEU/Bancodedados/DBSISCOM.FDB"

try:
    conn = fdb.connect(
        database=db_path,
        user="SYSDBA",
        password="masterkey",
        charset="UTF8"
    )
    print("Successfully connected to local Firebird!")
    
    cur = conn.cursor()
    
    # 1. Total faturamento for December 2025 (all notes where cancelada = 0)
    cur.execute("""
        SELECT COUNT(*), SUM(vlrtotalnota) 
        FROM tbnotassaida 
        WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao <= '2025-12-31'
    """)
    row = cur.fetchone()
    print(f"Dec 2025 - All outbound notes (cancelada=0): count={row[0]}, sum={row[1]}")
    
    # 2. CFOP list in December 2025
    cur.execute("""
        SELECT cfo, COUNT(*), SUM(vlrtotalnota)
        FROM tbnotassaida
        WHERE cancelada = 0 AND codempresa = 1 AND dataemissao >= '2025-12-01' AND dataemissao <= '2025-12-31'
        GROUP BY cfo
        ORDER BY 3 DESC
    """)
    print("\nDec 2025 - Outbound notes grouped by CFOP:")
    for r in cur.fetchall():
        print(f"  CFOP: {r[0]} | Count: {r[1]} | Sum: {r[2]}")
        
    # 3. Returns in December 2025
    cur.execute("""
        SELECT cfo, COUNT(*), SUM(vlrtotalnota)
        FROM tbnotasentrada
        WHERE cancelada = 0 AND codempresa = 1 AND dataentrada >= '2025-12-01' AND dataentrada <= '2025-12-31'
          AND cfo IN (1201, 1202, 2201, 2202, 1411)
        GROUP BY cfo
    """)
    print("\nDec 2025 - Return notes (tbnotasentrada) grouped by CFOP:")
    for r in cur.fetchall():
        print(f"  CFOP: {r[0]} | Count: {r[1]} | Sum: {r[2]}")
        
    # 4. Total return faturamento
    cur.execute("""
        SELECT SUM(vlrtotalnota)
        FROM tbnotasentrada
        WHERE cancelada = 0 AND codempresa = 1 AND dataentrada >= '2025-12-01' AND dataentrada <= '2025-12-31'
          AND cfo IN (1201, 1202, 2201, 2202, 1411)
    """)
    return_sum = cur.fetchone()[0] or 0
    print(f"Dec 2025 - Total Returns Sum: {return_sum}")
    
    conn.close()
except Exception as e:
    print(f"Failed to query Firebird: {e}")
