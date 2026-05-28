import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"C:\Windows\System32\logs\worker-20260527.log", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()
    for line in lines[-150:]:
        print(line.strip())
