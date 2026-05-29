import os

def find_db_files(root_dir):
    matches = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.lower().endswith(".db") or file.lower().endswith(".sqlite"):
                path = os.path.join(root, file)
                matches.append(path)
                print(f"Found DB: {path}")
    return matches

print("Searching in workerVet:")
find_db_files(r"C:\Mac\Home\Documents\GitHub\workerVet")
print("Searching in C:\\Coliseu:")
find_db_files(r"C:\Coliseu")
