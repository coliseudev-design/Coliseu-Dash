import re

with open("middleware/src/routes/ranking.js", "r", encoding="utf-8") as f:
    content = f.read()

# Split into router endpoints (router.get)
endpoints = content.split("router.get(")
print(f"Total endpoints: {len(endpoints) - 1}")

for idx, endpoint in enumerate(endpoints[1:], 1):
    # Get the route path
    match_path = re.match(r"['\"]([^'\"]+)['\"]", endpoint.strip())
    if not match_path:
        continue
    path = match_path.group(1)
    
    # Find all SQL queries within this endpoint block (using backticks, single quotes, or double quotes)
    queries = re.findall(r"db\.query\(\s*`([^`]+)`", endpoint)
    queries_sq = re.findall(r"db\.query\(\s*'([^']+)'", endpoint)
    queries_dq = re.findall(r"db\.query\(\s*\"([^\"]+)\"", endpoint)
    
    all_queries = queries + queries_sq + queries_dq
    
    for q_idx, q in enumerate(all_queries, 1):
        # Check if the query queries dash_vendas or dash_vendas_itens
        if "dash_vendas" in q or "dash_vendas_itens" in q:
            # Check if it has salesFilter
            if "salesFilter" not in q and "dash_usuarios" not in q:
                print(f"MISTAKE in Route {path}: query {q_idx} is missing salesFilter!")
                print("Query excerpt:")
                lines = q.strip().split("\n")
                for line in lines[:8]:
                    print("  ", line.strip())
                print("-" * 40)
