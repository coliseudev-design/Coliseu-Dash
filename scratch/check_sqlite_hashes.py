"""
Verificar os arquivos sync_cache.sqlite encontrados no computador.
"""
import sqlite3
import os

appdata = os.environ.get('APPDATA', '')
paths = [
    os.path.join(appdata, r"ColiseuSales\Worker\sync_cache.sqlite"),
    os.path.join(appdata, r"ColiseuSales\Worker_BrandaoTeste2\sync_cache.sqlite"),
    os.path.join(appdata, r"ColiseuSales\Worker_PIVETA\sync_cache.sqlite"),
    os.path.join(appdata, r"ColiseuSales\Worker_PivetaFilial2\sync_cache.sqlite"),
]

for p in paths:
    if os.path.exists(p):
        print(f"\n=== {p} ===")
        try:
            conn = sqlite3.connect(p)
            cur = conn.cursor()
            cur.execute("SELECT Entity, count(*) FROM SyncHashes GROUP BY 1")
            for r in cur.fetchall():
                print(f"  Entity: {r[0]} -> {r[1]} hashes")
            conn.close()
        except Exception as e:
            print(f"  Erro: {e}")
