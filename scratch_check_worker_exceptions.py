import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

found_errs = []
with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "[err]" in line.lower() or "exception" in line.lower() or "error" in line.lower() or "fail" in line.lower():
        # Print the line and the next 5 lines
        found_errs.append((idx, line.strip()))

print(f"Total error lines: {len(found_errs)}")
print("=== LAST 20 ERROR ENTRIES (WITH CONTEXT) ===")
for idx, line in found_errs[-20:]:
    print(f"\nLine {idx}: {line}")
    # Print next 8 lines
    for offset in range(1, 9):
        if idx + offset < len(lines):
            print(f"  +{offset}: {lines[idx+offset].strip()}")
