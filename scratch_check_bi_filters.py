with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

out = []
for i, line in enumerate(lines):
    if "db.query(" in line:
        out.append(f"Line {i+1}: {line.strip()}")
        for j in range(i + 1, min(len(lines), i + 8)):
            out.append(f"  [{j+1}]: {lines[j].strip()}")
        out.append("-" * 50)

with open("scratch_bi_queries.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print(f"Saved {len(out)} lines to scratch_bi_queries.txt")
