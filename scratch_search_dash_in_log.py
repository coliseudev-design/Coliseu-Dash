import os
import sys

# Set standard output encoding to utf-8
sys.stdout.reconfigure(encoding='utf-8')

paths = [
    r"c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\logs\worker-20260526.log",
    r"c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\logs\worker-20260514.log",
    r"c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\logs\worker-20260430.log"
]

for path in paths:
    if os.path.exists(path):
        print(f"\n=== Searching {path} ===")
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        count = 0
        for i, line in enumerate(lines):
            line_lower = line.lower()
            # Let's search for logs that mention dashboard, dash, or errors/warns
            if 'dash' in line_lower or 'vendas' in line_lower:
                print(f"Line {i+1}: {line.strip()}")
                count += 1
                if count > 150:
                    print("... truncated after 150 matches ...")
                    break
