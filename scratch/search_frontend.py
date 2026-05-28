import re

def search_file(filepath):
    print(f"=== Searching {filepath} ===")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Search for period buttons, date filters, api requests
    for match in re.finditer(r'(Dezembro|DEC|2025|period|startDate|start_date|endDate|end_date|api/bi/sales/executive-summary)', content, re.IGNORECASE):
        start = max(0, match.start() - 60)
        end = min(len(content), match.end() + 60)
        snippet = content[start:end].replace('\n', ' ')
        print(f"Match found around pos {match.start()}: ... {snippet} ...")

search_file('frontend/src/pages/VisaoEstrategicaV3.tsx')
search_file('frontend/src/pages/VisaoEstrategicaV4.tsx')
