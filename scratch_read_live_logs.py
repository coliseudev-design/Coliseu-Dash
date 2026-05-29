import sys
import re
sys.stdout.reconfigure(encoding='utf-8')

uuid_pattern = re.compile(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')

with open(r"C:\Windows\System32\logs\worker-20260528.log", "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        uuids = uuid_pattern.findall(line)
        if uuids:
            print(f"Line: {line.strip()}")
            break # Print just the first matching line to see the tenant ID
