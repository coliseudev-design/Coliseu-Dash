import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

found = []
with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "[dashboard sync]" in line.lower():
            found.append(line.strip())

print(f"Total dashboard sync log lines: {len(found)}")
print("=== LAST 100 DASHBOARD SYNC LINES ===")
for l in found[-100:]:
    print(l)
