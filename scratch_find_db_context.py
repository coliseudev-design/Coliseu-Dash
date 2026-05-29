import os

root_dir = r"c:\Mac\Home\Documents\GitHub\Coliseu-Dash\middleware\src"
for r, d, files in os.walk(root_dir):
    for f in files:
        if f.endswith(".js"):
            path = os.path.join(r, f)
            with open(path, "r", encoding="utf-8", errors="ignore") as file:
                content = file.read()
                if "dbContext" in content or "dbType" in content:
                    print(f"Found in {path}")
                    for line_num, line in enumerate(content.splitlines(), 1):
                        if "dbContext" in line or "dbType" in line:
                            print(f"  {line_num}: {line.strip()}")
