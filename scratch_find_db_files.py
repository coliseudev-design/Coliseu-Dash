import os
import glob

search_paths = [
    r"C:\Coliseu",
    r"C:\ColiseuSales",
    r"C:\ProgramData\ColiseuSales",
    r"C:\ProgramData\Coliseu",
    r"C:\Users\rober\AppData\Local\Coliseu",
]

for p in search_paths:
    if os.path.exists(p):
        print(f"=== Path: {p} ===")
        for root, dirs, files in os.walk(p):
            for f in files:
                if any(ext in f.lower() for ext in ['.db', '.sqlite', '.dat', '.json', '.xml', '.bin', '.cache']):
                    print(os.path.join(root, f))
