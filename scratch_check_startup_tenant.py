import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"C:\Windows\System32\logs\worker-20260527.log", "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "tenant" in line.lower() and "vps api" in line.lower():
            print(line.strip())
