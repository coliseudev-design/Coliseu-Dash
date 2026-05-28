def search_file(filepath):
    print(f"=== Searching {filepath} ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Search for queries in estatisticas routes
    import re
    for match in re.finditer(r'(router.get|status|dash_vendas|COALESCE|SUM|faturadas|overview|kpis)', content, re.IGNORECASE):
        start = max(0, match.start() - 60)
        end = min(len(content), match.end() + 60)
        snippet = content[start:end].replace('\n', ' ')
        print(f"Match found: ... {snippet} ...")

search_file('middleware/src/routes/estatisticas.js')
