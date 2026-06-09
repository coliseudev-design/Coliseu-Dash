import os
import fnmatch

def find_files(directory, pattern):
    found = []
    for root, dirs, files in os.walk(directory):
        for basename in files:
            if fnmatch.fnmatch(basename, pattern):
                filename = os.path.join(root, basename)
                found.append(filename)
    return found

print("Searching for sync_cache.sqlite in C:\\Users...")
files = find_files("C:\\Users", "sync_cache.sqlite")
for f in files:
    print(f"Found: {f} (Size: {os.path.getsize(f)} bytes)")

print("\nSearching for sync_cache.sqlite in C:\\Windows...")
# Search Windows but skip typical system folders to avoid infinite loops or slow runs
# We will just search under C:\\Windows\\System32\\config
try:
    for root, dirs, files in os.walk("C:\\Windows\\System32\\config"):
        for basename in files:
            if fnmatch.fnmatch(basename, "sync_cache.sqlite"):
                filename = os.path.join(root, basename)
                print(f"Found in config: {filename} (Size: {os.path.getsize(filename)} bytes)")
except Exception as e:
    print(f"Error searching C:\\Windows: {e}")
