import os

# Search all files for VET database config
for root, dirs, files in os.walk('.'):
    for file in files:
        if file.endswith(('.js', '.py', '.json', '.yml', '.yaml', '.sh', '.sql')):
            if 'node_modules' in root or '.git' in root or '.vite' in root:
                continue
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if 'VET' in content or 'vet' in content or 'postgresVet' in content:
                    # print matching lines
                    lines = content.split('\n')
                    for i, l in enumerate(lines):
                        if any(k in l for k in ['VET', 'vet', 'postgresVet']):
                            print(f"{path}:{i+1}: {l.strip()}")
            except Exception:
                pass
