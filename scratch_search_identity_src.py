import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

search_dir = r"c:\Users\rober\.gemini\antigravity\scratch\ColiseuSalesGit\Coliseu.Identity\src"

for root, dirs, files in os.walk(search_dir):
    dirs[:] = [d for d in dirs if d not in ('bin', 'obj', 'node_modules')]
    for file in files:
        if file.endswith(".cs") or file.endswith(".js"):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            if 'validate-key' in content.lower() or 'apikeyhash' in content.lower() or 'validatekey' in content.lower():
                print(f"Match in file: {path}")
                # Print lines matching
                lines = content.splitlines()
                for idx, line in enumerate(lines):
                    if any(x in line.lower() for x in ['validate', 'key', 'hash', 'api_key', 'apikey']):
                        print(f"  {idx+1}: {line.strip()}")
