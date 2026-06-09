import os
import glob

sysDir = r"C:\Windows\System32\config\systemprofile\AppData\Roaming"

print(f"Checking in: {sysDir}")
if os.path.exists(sysDir):
    # Search recursively for *.sqlite files
    sqlite_files = glob.glob(os.path.join(sysDir, "**", "*.sqlite"), recursive=True)
    for f in sqlite_files:
        print(f"Found: {f} (Size: {os.path.getsize(f)} bytes)")
else:
    print("Systemprofile appdata directory not found!")
