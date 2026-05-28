"""
Script para verificar dados diretamente no Firebird local do VetSeed
Caminho: C:\Mac\Home\Documents\PROJETOS COLISEU\Bancodedos\DBSISCOM.fdb
Instala fdb se necessário.
"""
import subprocess
import sys

# Tenta instalar fdb
def install_fdb():
    try:
        import fdb
        return True
    except ImportError:
        print("Instalando fdb...")
        result = subprocess.run([sys.executable, "-m", "pip", "install", "fdb"], 
                               capture_output=True, text=True)
        if result.returncode == 0:
            print("fdb instalado com sucesso")
            return True
        else:
            print("Erro ao instalar fdb:", result.stderr)
            return False

if not install_fdb():
    print("Não foi possível instalar fdb. Tentando firebird-driver...")
    result = subprocess.run([sys.executable, "-m", "pip", "install", "firebird-driver"], 
                           capture_output=True, text=True)
    print(result.stdout)
    print(result.stderr)

DB_PATH = r'C:\Mac\Home\Documents\PROJETOS COLISEU\Bancodedos\DBSISCOM.fdb'

try:
    import fdb
    
    print("Conectando ao Firebird...")
    con = fdb.connect(
        host='localhost',
        database=DB_PATH,
        user='SYSDBA',
        password='masterkey',
        charset='WIN1252'
    )
    
    cur = con.cursor()
    
    # Verificar pedidos de Dezembro 2025
    print("\n=== PEDIDOS DEZ 2025 - STATUS ===")
    cur.execute("""
        SELECT TRIM(STATUS_PEDIDO) as status, COUNT(*) as qtd, SUM(VLR_TOTAL) as total
        FROM PEDIDOS
        WHERE DATA_PEDIDO >= '2025-12-01' AND DATA_PEDIDO < '2026-01-01'
        GROUP BY TRIM(STATUS_PEDIDO)
        ORDER BY total DESC
    """)
    for row in cur.fetchall():
        print(row)
    
    # Total faturado
    print("\n=== PEDIDOS DEZ 2025 - FATURADOS ===")
    cur.execute("""
        SELECT COUNT(*) as qtd, SUM(VLR_TOTAL) as total
        FROM PEDIDOS
        WHERE DATA_PEDIDO >= '2025-12-01' AND DATA_PEDIDO < '2026-01-01'
          AND TRIM(STATUS_PEDIDO) IN ('FATURADO', 'FINALIZADO')
    """)
    for row in cur.fetchall():
        print(row)
        
    cur.close()
    con.close()
    print("\nConexão Firebird encerrada com sucesso.")
    
except Exception as e:
    print(f"\nErro ao conectar Firebird: {e}")
    print("\nTentando com firebird-driver...")
    
    try:
        from firebird.driver import connect, driver_config
        
        driver_config.server_defaults.host.value = 'localhost'
        con = connect(
            database=DB_PATH,
            user='SYSDBA', 
            password='masterkey',
        )
        
        cur = con.cursor()
        cur.execute("""
            SELECT TRIM(STATUS_PEDIDO), COUNT(*), SUM(VLR_TOTAL)
            FROM PEDIDOS
            WHERE DATA_PEDIDO >= '2025-12-01' AND DATA_PEDIDO < '2026-01-01'
            GROUP BY TRIM(STATUS_PEDIDO)
        """)
        for row in cur.fetchall():
            print(row)
        con.close()
        
    except Exception as e2:
        print(f"Erro firebird-driver: {e2}")
        print("\nNão foi possível conectar ao Firebird local.")
        print(f"Caminho do banco: {DB_PATH}")
        print("Verifique se o Firebird está instalado e o serviço está rodando.")
