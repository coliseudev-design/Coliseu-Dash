import os
import glob

appData = os.environ.get("APPDATA")
print(f"APPDATA environment variable: {appData}")

search_dir = os.path.join(appData, "ColiseuSales")
print(f"Searching in: {search_dir}")
if os.path.exists(search_dir):
    sqlite_files = glob.glob(os.path.join(search_dir, "**", "*.sqlite"), recursive=True)
    for f in sqlite_files:
        print(f"Found cache: {f} (Size: {os.path.getsize(f)} bytes)")
else:
    print("ColiseuSales folder not found under current user's APPDATA")
