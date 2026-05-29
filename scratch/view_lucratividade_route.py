with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's find the route definition around line 900
lines = content.splitlines()
for idx in range(920, min(len(lines), 1080)):
    print(f"{idx+1}: {lines[idx]}")
