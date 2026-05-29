with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    content = f.read()

# Find all lines containing dash_devolucoes and their surroundings
lines = content.splitlines()
for idx, line in enumerate(lines):
    if "dash_devolucoes" in line:
        start = max(0, idx - 4)
        end = min(len(lines), idx + 5)
        print(f"Lines {start+1}-{end}:")
        for j in range(start, end):
            print(f"  {j+1}: {lines[j]}")
        print("-" * 50)
