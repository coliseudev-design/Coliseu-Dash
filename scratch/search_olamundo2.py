import os

for root, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                if 'admin' in content.lower() or 'monitoramento' in content.lower() or 'vetseed' in content.lower():
                    lines = content.split('\n')
                    for i, l in enumerate(lines):
                        if any(k in l.lower() for k in ['admin', 'monitoramento', 'vetseed']):
                            print(f"{path}:{i+1}: {l.strip()}")
            except Exception:
                pass
