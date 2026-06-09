import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "dashboard" in line.lower() or "sync/dash" in line.lower():
            print(line.strip())
