import os

for root, dirs, files in os.walk('.'):
    # Skip git, node_modules, dist, etc.
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'dist', '.vite', '.agent', 'backup')]
    for file in files:
        low = file.lower()
        if 'sync' in low or 'worker' in low or 'firebird' in low or 'fdb' in low or 'siscom' in low or 'db' in low:
            print(os.path.join(root, file))
