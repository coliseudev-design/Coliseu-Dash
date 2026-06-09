import os
import glob

search_dir = r"C:\Sales"
print(f"Searching in: {search_dir}")
if os.path.exists(search_dir):
    sqlite_files = glob.glob(os.path.join(search_dir, "**", "*.sqlite"), recursive=True)
    for f in sqlite_files:
        print(f"Found cache: {f} (Size: {os.path.getsize(f)} bytes)")
else:
    print("C:\\Sales folder not found")
