import os

for root, dirs, files in os.walk(r"C:\Mac\Home\Documents"):
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'dist', '.vite', '.agent', 'backup')]
    for file in files:
        if file.startswith("worker-") and file.endswith(".log"):
            print(os.path.join(root, file))
