import os

log_dir = "/Users/kleber/Documents/GitHub/workerVet/worker/logs"
log_files = sorted([f for f in os.listdir(log_dir) if f.endswith(".log")])

if log_files:
    latest_file = os.path.join(log_dir, log_files[-1])
    print(f"=== Searching Log: {latest_file} ===")
    with open(latest_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        for idx, line in enumerate(lines):
            if "dashboard.coliseusistemas.com.br" in line:
                print(line.strip())
                # Print next 3 lines to see status/response
                for offset in range(1, 4):
                    if idx + offset < len(lines):
                        print(f"  + {lines[idx + offset].strip()}")
else:
    print("No log files found")
