import os

found = []
for root, dirs, files in os.walk('.'):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if '.git' in dirs:
        dirs.remove('.git')
    for file in files:
        if file.endswith(('.js', '.ts', '.tsx', '.json', '.md', '.txt')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'thiago' in content or 'vet.com.br' in content:
                        found.append(path)
            except Exception:
                pass

print("Files containing 'thiago' or 'vet.com.br':")
for f in found:
    print("  ", f)
