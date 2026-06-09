import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

log_file = r"C:\Windows\System32\logs\worker-20260609.log"

if os.path.exists(log_file):
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        print(f"Total lines: {len(lines)}")
        print("=== LAST 150 LINES ===")
        for line in lines[-150:]:
            print(line.strip())
else:
    print("Log file not found.")
