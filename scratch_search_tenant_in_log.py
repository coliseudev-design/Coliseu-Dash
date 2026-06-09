import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

t1 = "5805c776-65b6-4df8-bcf5-46e00b68d5ed"
t2 = "1e40d65f-4319-4c68-ae13-66223820c095"

c1 = 0
c2 = 0
with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if t1 in line:
            c1 += 1
        if t2 in line:
            c2 += 1

print(f"Occurrences of Tenant {t1} (from local appsettings): {c1}")
print(f"Occurrences of Tenant {t2} (Piveta in database): {c2}")
