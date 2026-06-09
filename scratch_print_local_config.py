import os
import json

paths = [
    r"C:\Sales\appsettings.json",
    r"C:\Coliseu\Sales\appsettings.json",
    r"C:\ColiseuSales\appsettings.json",
]

for p in paths:
    if os.path.exists(p):
        print(f"=== Found config: {p} ===")
        with open(p, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                # Hide passwords if any for safety
                if "ConnectionStrings" in data:
                    for k in data["ConnectionStrings"]:
                        data["ConnectionStrings"][k] = "HIDDEN"
                print(json.dumps(data, indent=2))
            except Exception as e:
                print(f"Error reading JSON: {e}")
                f.seek(0)
                print(f.read())
    else:
        print(f"Config path does not exist: {p}")
