import re

with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for how cfopUtil or isVetContext is used in bi.js
print("Occurrences of cfopUtil:")
cfop_occs = [line for line in content.splitlines() if "cfopUtil" in line]
for line in cfop_occs:
    print(line)

print("\nOccurrences of salesFilter:")
sf_occs = [line for line in content.splitlines() if "salesFilter" in line]
for line in sf_occs[:10]:
    print(line)
print(f"Total salesFilter occurrences: {len(sf_occs)}")

# Let's search for any SQL query text that references dash_vendas but doesn't use salesFilter
print("\nScanning endpoints for query patterns...")
endpoints = content.split("router.get(")
for endpoint in endpoints[1:]:
    lines = endpoint.split("\n")
    path_match = re.search(r"['\"]([^'\"]+)['\"]", lines[0])
    if path_match:
        path = path_match.group(1)
        # Search for queries in this endpoint
        queries = re.findall(r"db\.query\(\s*`([^`]+)`", endpoint)
        for q in queries:
            if "dash_vendas" in q:
                if "salesFilter" not in q:
                    print(f"Path: {path} has a query without salesFilter:")
                    print(q[:200])
                    print("-" * 50)
