with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    lines = f.read().splitlines()

# Print lines 240 to 290
for idx in range(235, min(len(lines), 290)):
    print(f"{idx+1}: {lines[idx]}")
