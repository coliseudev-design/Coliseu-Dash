import os

for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', '.vite', '.agent', 'backup')]
    for file in files:
        if file.endswith(".js") or file.endswith(".py") or file.endswith(".json") or file.endswith(".sh"):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            if 'cleanup_non_faturados' in content:
                print(f"Match in file: {path}")
