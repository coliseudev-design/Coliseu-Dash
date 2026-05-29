with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    content = f.read()

# Find any queries with GROUP BY and MIN or MAX
import re
matches = re.findall(r"GROUP BY[^;]+", content)
for m in matches:
    if "MIN(" in m or "MAX(" in m:
        print("Invalid GROUP BY found:")
        print(m.strip())
        print("-" * 50)
