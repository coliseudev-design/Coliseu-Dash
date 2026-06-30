filepath = r'c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\ColiseuSales.Configurator\FirebirdBootstrapper.cs'
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re

# Let's search for "Bootstrap" or "run" or "Execute" methods
methods = re.findall(r'(public\s+async\s+Task\s+\w+[\s\S]*?{)', content, re.IGNORECASE)
print("Public async methods:")
for m in methods[:5]:
    print(m)
