import os

for root, dirs, files in os.walk(r'middleware/src'):
    for file in files:
        if file.endswith('.js'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'req.tenant' in content or 'req.headers' in content:
                    print(path)
