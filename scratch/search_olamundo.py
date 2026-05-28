import os

for root, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'Olá,' in content or 'Monitoramento de vendas' in content or 'VETSEED' in content:
                print(f"Found in {path}")
                # print matching lines
                lines = content.split('\n')
                for i, l in enumerate(lines):
                    if any(k in l for k in ['Olá,', 'Monitoramento de vendas', 'VETSEED']):
                        print(f"  {i+1}: {l.strip()}")
