with open("middleware/src/routes/financeiro.js", "r", encoding="utf-8") as f:
    content = f.read()

import re
print("Occurrences of isVetContext in financeiro.js:")
print([line for line in content.splitlines() if "isVetContext" in line])

print("Occurrences of cfop in financeiro.js:")
print([line for line in content.splitlines() if "cfop" in line])

print("Occurrences of MAX(data_venda) in financeiro.js:")
print([line for line in content.splitlines() if "MAX(" in line])
