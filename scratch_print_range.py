import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"C:\Mac\Home\Documents\GitHub\workerVet\worker\logs\worker-20260526.log", "r", encoding="utf-8", errors="ignore") as f:
    printing = False
    count = 0
    for line in f:
        if "13:52:59" in line:
            printing = True
        if printing:
            print(line.strip())
            count += 1
            if count > 40:
                break
