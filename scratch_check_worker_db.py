import sqlite3

db_path = r"C:\Coliseu\Data\worker.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get list of tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("=== Tables in worker.db ===")
for t in tables:
    print(t[0])

# Print schema/rows for each table
for t in tables:
    table_name = t[0]
    print(f"\n=== Table: {table_name} ===")
    cursor.execute(f"PRAGMA table_info({table_name});")
    info = cursor.fetchall()
    for col in info:
        print(f"  Column: {col[1]} ({col[2]})")
        
    cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
    count = cursor.fetchone()[0]
    print(f"  Row count: {count}")
    
    if count > 0:
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 5;")
        rows = cursor.fetchall()
        print("  Sample rows:")
        for r in rows:
            print("   ", r)

conn.close()
