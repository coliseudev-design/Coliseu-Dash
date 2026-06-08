import os

root_dir = "/Users/kleber/Documents/GitHub/Coliseu-Dash"
for r, d, files in os.walk(root_dir):
    for f in files:
        if f.startswith(".env"):
            print(os.path.join(r, f))
