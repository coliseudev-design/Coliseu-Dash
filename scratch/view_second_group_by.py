with open("middleware/src/routes/bi.js", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("GROUP BY TO_CHAR(v.data_venda, 'MM/YYYY')")
if idx != -1:
    print(content[idx-200:idx+600])
else:
    print("Not found")
