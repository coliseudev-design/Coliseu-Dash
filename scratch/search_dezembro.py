with open('frontend/src/pages/VisaoEstrategicaV3.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if 'Dezembro' in l or '2025' in l or 'Filter' in l:
        print(f"V3:{i+1}: {l.strip()}")
