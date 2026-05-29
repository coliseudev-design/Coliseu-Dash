import os

found = []
for root, dirs, files in os.walk('middleware/src'):
    for file in files:
        if file.endswith('.js'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'login' in content.lower():
                        found.append(path)
            except Exception:
                pass

print("Files containing 'login':")
for f in found:
    print("  ", f)
