import re

with open('middleware/src/routes/bi.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Search for routes or endpoints
for idx, line in enumerate(lines):
    if 'router.get' in line or 'router.post' in line or 'dashboard-data' in line or 'executive-summary' in line:
        print(f"Line {idx+1}: {line.strip()}")
