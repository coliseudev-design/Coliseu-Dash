import os

targets = ["PG_HOST_VET", "postgresVet", "layoutVersion", "layout_version"]
found = {}

for root, dirs, files in os.walk('.'):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if '.git' in dirs:
        dirs.remove('.git')
    for file in files:
        if file.endswith(('.js', '.json', '.ts', '.tsx', '.py', '.yml', '.yaml', '.sql')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for t in targets:
                        if t in content:
                            if t not in found:
                                found[t] = []
                            found[t].append(path)
            except Exception:
                pass

for t, paths in found.items():
    print(f"=== Target: {t} ({len(paths)} files) ===")
    for p in paths[:10]:
        print("  ", p)
    if len(paths) > 10:
        print("   ...")
