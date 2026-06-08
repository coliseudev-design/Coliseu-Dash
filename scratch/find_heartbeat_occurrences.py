import os

def main():
    root = r"C:\Users\rober\.gemini\antigravity\scratch\Coliseu_Sales\worker"
    for dirpath, dirnames, filenames in os.walk(root):
        # ignore bin, obj, publish
        if any(p in dirpath.split(os.sep) for p in ['bin', 'obj', 'publish']):
            continue
        for filename in filenames:
            if filename.endswith('.cs'):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        for idx, line in enumerate(f, 1):
                            if 'heartbeat' in line.lower():
                                print(f"{filename}:{idx} -> {line.strip()}")
                except Exception as e:
                    pass

if __name__ == '__main__':
    main()
