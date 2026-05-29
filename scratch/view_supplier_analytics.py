with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("router.get('/supplier/analytics'")
if idx != -1:
    print(content[idx:idx+4000])
else:
    print("Endpoint not found")
