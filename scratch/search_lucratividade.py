import os

found = []
for root, dirs, files in os.walk('middleware/src/routes'):
    for file in files:
        if file.endswith('.js'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'lucratividade' in content.lower() or 'lucro' in content.lower():
                        found.append(path)
            except Exception:
                pass

print("Files referencing lucratividade or lucro:")
for f in found:
    print("  ", f)
