filepath = r'c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\ColiseuSales.Configurator\MainForm.cs'
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re

# Let's search for "Preparar" or "Preparar Banco" or similar in MainForm
matches = re.findall(r'(\w*Preparar\w*)', content, re.IGNORECASE)
print(f"Matches for 'Preparar': {set(matches)}")

# Search for FirebirdBootstrapper calls
bootstrap_calls = re.findall(r'(\w*Bootstrapper\w*)', content, re.IGNORECASE)
print(f"Bootstrapper calls: {set(bootstrap_calls)}")

# Let's look for how configurations are saved
save_matches = re.findall(r'(void\s+\w*Save\w*[\s\S]*?{)', content, re.IGNORECASE)
print(f"Save methods:")
for sm in save_matches[:5]:
    print(sm)
