import os

paths_to_check = [
    r"C:\Windows\Sysnative",
    r"C:\Windows\Sysnative\config",
    r"C:\Windows\Sysnative\config\systemprofile",
    r"C:\Windows\Sysnative\config\systemprofile\AppData",
    r"C:\Windows\Sysnative\config\systemprofile\AppData\Roaming",
    r"C:\Windows\Sysnative\config\systemprofile\AppData\Roaming\ColiseuSales",
    r"C:\Windows\Sysnative\config\systemprofile\AppData\Roaming\ColiseuSales\Worker_Pivetanovo",
    r"C:\Windows\Sysnative\config\systemprofile\AppData\Roaming\ColiseuSales\Worker_Pivetanovo\sync_cache.sqlite",
]

for p in paths_to_check:
    exists = os.path.exists(p)
    is_dir = os.path.isdir(p) if exists else False
    size = os.path.getsize(p) if (exists and not is_dir) else 0
    print(f"Path: {p} | Exists: {exists} | IsDir: {is_dir} | Size: {size}")
