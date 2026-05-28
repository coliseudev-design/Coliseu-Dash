import os

for root, dirs, files in os.walk('middleware/src'):
    for file in files:
        if file.endswith('.js'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'dbType' in content or 'store' in content:
                # Find all occurrences
                import re
                for m in re.finditer(r'dbType', content):
                    start = max(0, m.start() - 60)
                    end = min(len(content), m.end() + 60)
                    print(f"Found in {path}: ... {content[start:end].replace('\n', ' ')} ...")
