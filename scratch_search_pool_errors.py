import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

errors = []
with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "connection pool" in line.lower() or "falha na sincronização" in line.lower() or "exception" in line.lower() or "err" in line.lower():
            errors.append(line.strip())

print(f"Total error/warning/exception lines: {len(errors)}")
print("=== LAST 80 ERROR LINES ===")
for e in errors[-80:]:
    print(e)
