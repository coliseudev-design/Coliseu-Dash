import os
import glob

# Try common paths for worker logs
paths = [
    r"C:\Windows\System32\logs",
    r"C:\Coliseu\Logs",
    r"C:\Coliseu\Worker\Logs",
    r"C:\ColiseuSales\Logs",
    r"C:\Users\rober\AppData\Local\ColiseuSales",
    r"C:\Sales\logs",
    r"C:\Sales\Worker\logs",
    r"C:\Sales",
]


for p in paths:
    if os.path.exists(p):
        print(f"=== Path exists: {p} ===")
        files = glob.glob(os.path.join(p, "worker-*.log"))
        for f in files:
            print(f"Log file: {f} (Size: {os.path.getsize(f)} bytes)")
    else:
        print(f"Path does not exist: {p}")
