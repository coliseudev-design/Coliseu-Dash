import os

root_dir = r"c:\Mac\Home\Documents\GitHub\Coliseu-Dash"
for r, d, files in os.walk(root_dir):
    if "node_modules" in r or ".git" in r or "dist" in r:
        continue
    for f in files:
        path = os.path.join(r, f)
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as file:
                content = file.read()
                if "thiago" in content or "3edd56b4" in content:
                    print(f"Found in {path}")
        except Exception:
            pass
