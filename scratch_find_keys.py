import os

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'dist', '.vite', '.agent', 'backup')]
    for file in files:
        low = file.lower()
        if 'pem' in low or 'key' in low or 'rsa' in low or 'ssh' in low:
            print(os.path.join(root, file))
