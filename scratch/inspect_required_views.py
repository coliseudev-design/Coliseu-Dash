filepath = r'c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\ColiseuSales.Configurator\FirebirdBootstrapper.cs'
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
lines = content.split('\n')
for i, line in enumerate(lines, 1):
    if "RequiredViews" in line:
        print(f"Line {i}: {line.strip()}")
