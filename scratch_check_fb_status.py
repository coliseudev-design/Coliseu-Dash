import sqlite3
import os

DB_PATH = r"C:\COLISEUWORKERVETT APLICACAO\ColiseuVet\Worker\sync_cache.sqlite"

if os.path.exists(DB_PATH):
    print(f"File size: {os.path.getsize(DB_PATH)} bytes")
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cur.fetchall()]
        print("=== Tables ===")
        print(tables)
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            print(f"  Table {t}: {cur.fetchone()[0]} rows")
        if "SyncHashes" in tables:
            cur.execute("SELECT Entity, COUNT(*) FROM SyncHashes GROUP BY Entity;")
            print("  Entity counts:")
            for r in cur.fetchall():
                print(f"    {r[0]}: {r[1]}")
        conn.close()
    except Exception as e:
        print("Error:", e)
else:
    print("File not found:", DB_PATH)
