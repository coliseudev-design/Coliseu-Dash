import os

search_paths = [
    r"C:\Coliseu\Sales",
    r"C:\Coliseu",
    r"C:\ProgramData\ColiseuSales",
    r"C:\ProgramData\Coliseu",
    r"C:\Users\rober\AppData\Local\ColiseuSales",
]

for p in search_paths:
    if os.path.exists(p):
        print(f"=== Path: {p} ===")
        for root, dirs, files in os.walk(p):
            # Exclude large nested dirs to keep it fast and narrow
            if "Programa" in root or "Templates" in root or "wv2" in root:
                continue
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in ['.db', '.sqlite', '.sqlite3', '.db3', '.dat', '.json'] or 'cache' in f.lower() or 'sync' in f.lower():
                    print(os.path.join(root, f))
