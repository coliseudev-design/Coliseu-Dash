import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

print(f"Total lines in log: {len(lines)}")
print("=== LAST 150 LOG LINES ===")
for l in lines[-150:]:
    print(l.strip())
