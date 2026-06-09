import os

search_dir = r"c:\Users\rober\.gemini\antigravity\scratch\ColiseuSalesGit\Coliseu.Identity\src"

for root, dirs, files in os.walk(search_dir):
    dirs[:] = [d for d in dirs if d not in ('bin', 'obj', 'node_modules')]
    for file in files:
        if file.lower() == "company.cs":
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                print(f"=== {path} ===")
                print(f.read())
