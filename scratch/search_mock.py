with open('frontend/src/pages/VisaoEstrategicaV3.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Search for faturamento numbers
for num in ['7.118', '7118', '1378', '1.378', '5.166', '5166', '5.166,06', '7.118.824']:
    if num in content:
        print(f"Found {num} in VisaoEstrategicaV3.tsx")

# Also check VisaoEstrategicaV4.tsx
with open('frontend/src/pages/VisaoEstrategicaV4.tsx', 'r', encoding='utf-8') as f:
    content4 = f.read()

for num in ['7.118', '7118', '1378', '1.378', '5.166', '5166', '5.166,06', '7.118.824', '1.499.561', '1499561', '542', '2.766', '2766']:
    if num in content4:
        print(f"Found {num} in VisaoEstrategicaV4.tsx")
