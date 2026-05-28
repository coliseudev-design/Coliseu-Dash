import sys

# Set stdout to use utf-8 or replace errors
sys.stdout.reconfigure(encoding='utf-8')

with open(r"C:\Mac\Home\Documents\GitHub\workerVet\worker\logs\worker-20260526.log", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()
    for line in lines[-200:]:
        print(line.strip())
