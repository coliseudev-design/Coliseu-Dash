with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    content = f.read()

# Print the implementation of getBiDateRange or getAnchoredRange if they exist
import re
match = re.search(r"function\s+getBiDateRange\s*\([^)]*\)\s*\{[^}]*\}", content)
if match:
    print("Found getBiDateRange:")
    print(match.group(0))
else:
    # Let's search for function getBiDateRange using search
    idx = content.find("getBiDateRange")
    if idx != -1:
        print("getBiDateRange snippet:")
        print(content[idx:idx+1500])
