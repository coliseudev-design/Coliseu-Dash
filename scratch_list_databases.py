import os

def search_text(root_dir, text):
    matches = []
    for root, dirs, files in os.walk(root_dir):
        if ".git" in root or "node_modules" in root or ".vite" in root:
            continue
        for file in files:
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if text in content:
                        matches.append(path)
            except Exception:
                pass
    return matches

print("Search for 3edd56b4:")
print(search_text(r"c:\Mac\Home\Documents\GitHub\Coliseu-Dash", "3edd56b4"))
print("Search for thiago:")
print(search_text(r"c:\Mac\Home\Documents\GitHub\Coliseu-Dash", "thiago"))
