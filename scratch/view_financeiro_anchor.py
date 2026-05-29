with open("middleware/src/routes/financeiro.js", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("SELECT COALESCE(MAX(data_emissao)")
if idx != -1:
    print("Found anchor query:")
    print(content[idx-200:idx+600])
else:
    print("Anchor query not found")
