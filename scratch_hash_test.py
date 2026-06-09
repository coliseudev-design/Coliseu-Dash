import hashlib

keys = ["COL-BKEQ-6TAK-F55R", "COL-YUZA-9WSK-TN88", "COL-KGV7-UFY2-XEBX", "COL-BKEQ-6TAK-F55R".lower(), "COL-YUZA-9WSK-TN88".lower()]

for k in keys:
    h = hashlib.sha256(k.encode()).hexdigest()
    print(f"Key: {k} -> SHA256: {h}")
