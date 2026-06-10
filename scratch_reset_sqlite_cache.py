import sqlite3
import os

db_paths = [
    r"C:\Windows\System32\config\systemprofile\AppData\Roaming\ColiseuSales\Worker_Piveta\sync_cache.sqlite",
    r"C:\Windows\System32\config\systemprofile\AppData\Roaming\ColiseuSales\Worker_Pivetanovo\sync_cache.sqlite"
]

for path in db_paths:
    if not os.path.exists(path):
        print(f"Path does not exist: {path}")
        continue
    try:
        print(f"Connecting to SQLite: {path}...")
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        
        # Check current positions and hashes
        cur.execute("SELECT COUNT(*) FROM SyncHashes")
        print("Before reset - Total hashes:", cur.fetchone()[0])
        
        # Reset positions and hashes
        cur.execute("DELETE FROM JobSyncPositions")
        cur.execute("DELETE FROM SyncHashes")
        conn.commit()
        
        # Verify
        cur.execute("SELECT COUNT(*) FROM SyncHashes")
        print("After reset - Total hashes:", cur.fetchone()[0])
        
        conn.close()
        print(f"SUCCESS: Reset sync positions and hashes in {path}\n")
    except Exception as e:
        print(f"FAILED for {path}: {e}\n")
