import os

search_dir = r"c:\Users\rober\.gemini\antigravity\scratch\ColiseuSalesGit\Coliseu.Identity\src"

for root, dirs, files in os.walk(search_dir):
    dirs[:] = [d for d in dirs if d not in ('bin', 'obj', 'node_modules')]
    for file in files:
        if file.endswith(".cs"):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            if 'class encryptionservice' in content.lower() or 'interface iencryptionservice' in content.lower():
                print(f"Match in file: {path}")
                # print first 50 lines
                lines = content.splitlines()
                for idx, line in enumerate(lines[:60]):
                    print(f"  {idx+1}: {line}")
