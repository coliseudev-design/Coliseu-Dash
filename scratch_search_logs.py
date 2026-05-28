import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"C:\Mac\Home\Documents\GitHub\workerVet\worker\logs\worker-20260526.log", "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "dashboard" in line.lower() or "sync" in line.lower():
            if "financial" not in line.lower() and "price" not in line.lower():
                print(line.strip())
