import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

counts = {}
unique_lines = []

with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "dashboard" in line.lower() or "sync/dash" in line.lower():
            if "heartbeat" in line.lower():
                continue
            # Keep the last 100 non-heartbeat dashboard lines
            unique_lines.append(line.strip())
            if len(unique_lines) > 100:
                unique_lines.pop(0)

print(f"Total non-heartbeat dashboard log lines today: {len(unique_lines)}")
print("=== LAST 100 NON-HEARTBEAT LOG ENTRIES ===")
for l in unique_lines:
    print(l)
