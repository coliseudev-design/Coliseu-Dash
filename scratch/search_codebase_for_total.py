import os

SEARCH_DIR = r'c:\Mac\Home\Documents\GitHub\Coliseu-Dash'
PATTERNS = ["1.499.561", "1499561", "1,499,561"]

def search_files():
    for root, dirs, files in os.walk(SEARCH_DIR):
        # Exclude dot folders and node_modules
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'node_modules' and d != 'dist']
        for file in files:
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    for p in PATTERNS:
                        if p in content:
                            print(f"Found '{p}' in {filepath}")
            except Exception as e:
                pass

if __name__ == '__main__':
    search_files()
