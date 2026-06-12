import zipfile

zip_path = '/Users/kleber/Documents/GitHub/WorkerColiseu.zip'

try:
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        print("=== Files in WorkerColiseu.zip ===")
        # Print first 100 files
        namelist = zip_ref.namelist()
        for name in namelist[:100]:
            print(name)
        if len(namelist) > 100:
            print(f"... and {len(namelist) - 100} more files")
except Exception as e:
    print(f"Error: {e}")
