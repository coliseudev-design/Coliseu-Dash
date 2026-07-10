import os

print("=== FILES IN ColiseuSales.Worker ===")
path = "/Users/kleber/Documents/GitHub/ColiseuSales/worker/ColiseuSales.Worker"
if os.path.exists(path):
    for root, dirs, files in os.walk(path):
        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file), path)
            print(f"- {rel_path}")
else:
    print(f"Path does not exist: {path}")
