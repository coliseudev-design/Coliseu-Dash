with open("middleware/src/routes/filiais.js", "r", encoding="utf-8") as f:
    content = f.read()

print("isVetContext in filiais.js:", "isVetContext" in content)
print("cfop in filiais.js:", "cfop" in content)
