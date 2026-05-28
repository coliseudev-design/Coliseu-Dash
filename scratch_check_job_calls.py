import sys
sys.stdout.reconfigure(encoding='utf-8')

endpoints = set()
with open(r"C:\Mac\Home\Documents\GitHub\workerVet\worker\logs\worker-20260526.log", "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "dashboard.coliseusistemas.com.br/internal/sync/" in line:
            parts = line.split("dashboard.coliseusistemas.com.br/internal/sync/")
            if len(parts) > 1:
                endpoint = parts[1].strip().split(" ")[0].split("\n")[0]
                endpoints.add(endpoint)

print("Endpoints hit:")
for ep in sorted(endpoints):
    print(ep)
