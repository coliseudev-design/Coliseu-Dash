import os

log_dir = "/Users/kleber/Documents/GitHub/workerVet/worker/logs"
log_files = sorted([f for f in os.listdir(log_dir) if f.endswith(".log")])

if log_files:
    latest_file = os.path.join(log_dir, log_files[-1])
    print(f"=== Latest Log: {latest_file} ===")
    with open(latest_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        for line in lines[-100:]:
            print(line.strip())
else:
    print("No log files found")
