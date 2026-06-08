import os

def main():
    root = r"c:\Users\rober\.gemini\antigravity\scratch\Coliseu Dash"
    ips = ['2.24.82.19', '177.39.17.7']
    for dirpath, dirnames, filenames in os.walk(root):
        if any(p in dirpath.split(os.sep) for p in ['.git', 'node_modules', '.vite']):
            continue
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    for ip in ips:
                        if ip in content:
                            print(f"Found {ip} in {os.path.relpath(filepath, root)}")
            except Exception:
                pass

if __name__ == '__main__':
    main()
