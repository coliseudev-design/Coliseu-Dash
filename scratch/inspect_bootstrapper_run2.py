filepath = r'c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\ColiseuSales.Configurator\FirebirdBootstrapper.cs'
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re

# Find lines containing "public "
lines = content.split('\n')
for i, line in enumerate(lines, 1):
    if "public " in line and "(" in line and "class " not in line:
        print(f"Line {i}: {line.strip()}")
