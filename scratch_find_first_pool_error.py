import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    for i, line in enumerate(f):
        if "connection pool is full" in line.lower():
            print(f"First pool error at line {i+1}:")
            print(line.strip())
            # Print next 5 lines
            for _ in range(5):
                next_line = next(f, None)
                if next_line:
                    print(next_line.strip())
            break
    else:
        print("No pool error found in today's log.")
