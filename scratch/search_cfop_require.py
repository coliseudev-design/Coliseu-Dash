import os

found = []
for root, dirs, files in os.walk('middleware/src'):
    for file in files:
        if file.endswith('.js'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    if 'cfop' in f.read():
                        found.append(path)
            except Exception:
                pass

print("Files importing or referencing cfop:")
for f in found:
    print("  ", f)
