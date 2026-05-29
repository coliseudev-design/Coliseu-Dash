for filename in ["middleware/src/routes/clientes.js", "middleware/src/routes/sync.js", "middleware/src/routes/debug.js"]:
    print(f"=== File: {filename} ===")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            lines = f.read().splitlines()
            for i, line in enumerate(lines):
                if 'cfop' in line.lower() or 'vet' in line.lower():
                    # Print context of 5 lines around
                    start = max(0, i - 2)
                    end = min(len(lines), i + 3)
                    print(f"Lines {start+1}-{end}:")
                    for j in range(start, end):
                        print(f"  {j+1}: {lines[j]}")
                    print("-" * 30)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
