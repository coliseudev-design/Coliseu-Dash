import os

for root, dirs, files in os.walk(r"C:\\"):
    # Prune common large dirs to prevent slow walks
    dirs[:] = [d for d in dirs if d not in ('Windows', 'Program Files', 'Program Files (x86)', 'AppData', 'Library', '.git', 'node_modules')]
    for file in files:
        if file.startswith("worker-") and file.endswith(".log"):
            print(os.path.join(root, file))
