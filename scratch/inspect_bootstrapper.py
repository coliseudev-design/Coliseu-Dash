filepath = r'c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\ColiseuSales.Configurator\FirebirdBootstrapper.cs'
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re

# Let's search for CREATE VIEW or VIEW statements
matches = re.findall(r'(CREATE\s+VIEW\s+\w+\s+AS[\s\S]*?;)', content, re.IGNORECASE)
print(f"Found {len(matches)} CREATE VIEW matches:")
for idx, m in enumerate(matches):
    print(f"\n--- MATCH {idx+1} ---")
    print(m[:1000]) # Print first 1000 chars

# Also let's search for "DASH_"
print("\n=== Searching for DASH_ occurrences ===")
lines = content.split('\n')
for line_num, line in enumerate(lines, 1):
    if "DASH_" in line:
        print(f"Line {line_num}: {line.strip()}")
