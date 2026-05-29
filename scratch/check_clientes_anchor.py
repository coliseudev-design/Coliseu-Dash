with open("middleware/src/routes/clientes.js", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("anchorDate")
if idx != -1:
    print(content[idx-200:idx+400])
else:
    print("anchorDate not found")
