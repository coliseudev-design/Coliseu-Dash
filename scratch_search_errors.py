import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"C:\Mac\Home\Documents\GitHub\workerVet\worker\logs\worker-20260526.log", "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "[err]" in line.lower() or "exception" in line.lower() or "failed" in line.lower():
            if "dashboard" in line.lower() or "sync" in line.lower():
                print(line.strip())
