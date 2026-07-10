import os

print("=== SEARCHING FOR PYTHON AGENT OR SYNC SCRIPTS IN WORKSPACE ===")
for root, dirs, files in os.walk("/Users/kleber/Documents/GitHub/Coliseu-Dash"):
    for file in files:
        if file.endswith('.py') or file.endswith('.cs') or 'agent' in file.lower() or 'sync' in file.lower():
            # Skip virtual environments and git
            if '.venv' in root or 'node_modules' in root or '.git' in root or '.gemini' in root:
                continue
            path = os.path.join(root, file)
            print(f"- {path}")
