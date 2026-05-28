with open(r"C:\Mac\Home\Documents\GitHub\workerVet\worker\logs\worker-20260526.log", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()
    for line in lines[-150:]:
        print(line.strip())
