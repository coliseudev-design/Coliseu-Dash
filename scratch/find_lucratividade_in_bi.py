with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    content = f.read()

import re
lines = content.splitlines()
for idx, line in enumerate(lines):
    if "lucratividade" in line.lower() or "lucro" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
        # print 5 lines around if it looks like a route or query
        if "router." in line or "SELECT" in line or "from" in line:
            start = max(0, idx - 2)
            end = min(len(lines), idx + 8)
            print("--- CONTEXT ---")
            for j in range(start, end):
                print(f"  {j+1}: {lines[j]}")
            print("-" * 50)
