import os

paths_to_check = [
    r"C:\Windows\System32\config",
    r"C:\Windows\System32\config\systemprofile",
    r"C:\Windows\System32\config\systemprofile\AppData",
    r"C:\Windows\System32\config\systemprofile\AppData\Roaming",
    r"C:\Windows\System32\config\systemprofile\AppData\Roaming\ColiseuSales",
    r"C:\Windows\System32\config\systemprofile\AppData\Roaming\ColiseuSales\Worker_Pivetanovo",
]

for p in paths_to_check:
    exists = os.path.exists(p)
    is_dir = os.path.isdir(p) if exists else False
    print(f"Path: {p} | Exists: {exists} | IsDir: {is_dir}")
