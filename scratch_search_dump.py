with open("scratch_db_dump.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

out_lines = []
for i, line in enumerate(lines):
    if "3edd56b4" in line or "thiago" in line or "vet.com.br" in line or "a822a7e7" in line:
        out_lines.append(f"Line {i+1}: {line.strip()}")
        start = max(0, i - 2)
        end = min(len(lines), i + 3)
        for j in range(start, end):
            if j != i:
                out_lines.append(f"  [{j+1}]: {lines[j].strip()}")
        out_lines.append("-" * 50)

with open("scratch_search_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out_lines))

print(f"Done. Found {len(out_lines)} lines of output.")
