import os
import re

for root, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if '/bi/' in content or 'api/bi/' in content:
                print(f"Found in {path}")
                for m in re.finditer(r'/bi/\w+|api/bi/\w+', content):
                    print(f"  {m.group(0)}")
