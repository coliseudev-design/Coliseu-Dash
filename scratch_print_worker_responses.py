import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = r"c:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker\logs\worker-20260526.log"

if os.path.exists(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    # Let's find index of lines mentioning dash_vendas sending and print the lines and next 10 lines
    for idx, line in enumerate(lines):
        if 'Dashboard Sync' in line and 'dash_vendas' in line:
            print(f"\n--- MATCH AT LINE {idx+1} ---")
            for offset in range(-2, 8):
                if 0 <= idx + offset < len(lines):
                    print(f"{idx+1+offset}: {lines[idx+offset].strip()}")
            break # just print the first match's context
