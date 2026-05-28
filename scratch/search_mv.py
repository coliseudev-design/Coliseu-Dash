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
                if 'mv_dash_vendas_diario' in content or 'setup_views' in content:
                    lines = content.split('\n')
                    for i, l in enumerate(lines):
                        if 'mv_dash_vendas_diario' in l or 'setup_views' in l:
                            print(f"{path}:{i+1}: {l.strip()}")
            except Exception:
                pass
