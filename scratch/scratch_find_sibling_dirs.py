import os

print("=== CHECKING SIBLING DIRECTORIES IN GITHUB ===")
github_path = "/Users/kleber/Documents/GitHub"
try:
    siblings = os.listdir(github_path)
    for s in siblings:
        full_path = os.path.join(github_path, s)
        is_dir = os.path.isdir(full_path)
        print(f"- {s} ({'Directory' if is_dir else 'File'})")
except Exception as e:
    print(f"Error listing {github_path}: {e}")

print("=== CHECKING SCRIPTS FOLDER IN COLISEU-DASH ===")
coliseu_dash_path = "/Users/kleber/Documents/GitHub/Coliseu-Dash"
scripts_path = os.path.join(coliseu_dash_path, "scripts")
if os.path.exists(scripts_path):
    for f in os.listdir(scripts_path):
        print(f"  - {f}")
