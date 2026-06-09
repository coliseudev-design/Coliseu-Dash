import sys

sys.stdout.reconfigure(encoding='utf-8')
log_file = r"C:\Windows\System32\logs\worker-20260609.log"

keywords = ["venda", "pedido", "sales", "order", "dash_vendas", "faturamento"]

found = []
with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        # Avoid rank, price, naturezas, financials to reduce noise
        if any(kw in line.lower() for kw in keywords):
            if "sales-rankings" in line.lower() or "price" in line.lower() or "financials" in line.lower():
                continue
            found.append(line.strip())

print(f"Total matching lines: {len(found)}")
print("=== LAST 80 MATCHING LOG LINES ===")
for l in found[-80:]:
    print(l)
