import os

for root, dirs, files in os.walk('.'):
    for file in files:
        if file.endswith(('.js', '.py', '.sql', '.json', '.sh')):
            if 'node_modules' in root or '.git' in root or '.vite' in root:
                continue
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if 'cfop' in content.lower() or 'natureza' in content.lower():
                    # print matching lines
                    lines = content.split('\n')
                    for i, l in enumerate(lines):
                        if 'cfop' in l.lower() or 'natureza' in l.lower():
                            print(f"{path}:{i+1}: {l.strip()}")
            except Exception:
                pass
