import os

print("=== FILES IN ColiseuSales ===")
path = "/Users/kleber/Documents/GitHub/ColiseuSales"
if os.path.exists(path):
    for root, dirs, files in os.walk(path):
        # Limit depth
        depth = root[len(path):].count(os.sep)
        if depth > 2:
            continue
        for file in files:
            if '.git' in root or 'bin' in root or 'obj' in root or 'packages' in root or '.vs' in root:
                continue
            rel_path = os.path.relpath(os.path.join(root, file), path)
            print(rel_path)
else:
    print(f"Path does not exist: {path}")
