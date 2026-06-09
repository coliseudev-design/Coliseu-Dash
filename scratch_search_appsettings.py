import os

search_paths = [
    r"C:\Coliseu",
    r"C:\ColiseuSales",
    r"C:\ProgramData",
    r"C:\Users\rober\AppData\Local",
]

for p in search_paths:
    if os.path.exists(p):
        for root, dirs, files in os.walk(p):
            for f in files:
                if f == "appsettings.json":
                    path = os.path.join(root, f)
                    print(f"Found appsettings.json in: {path}")
                    try:
                        with open(path, "r", encoding="utf-8") as file:
                            print(file.read())
                    except Exception as e:
                        print("Error reading:", e)
