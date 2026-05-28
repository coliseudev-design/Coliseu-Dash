import os
import re

for root, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'Visão Estratégica (Vet)' in content or 'Acompanhamento de metas' in content:
                print(f"Found in {path}")
