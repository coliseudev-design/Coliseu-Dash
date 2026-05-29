import os

env_path = ".env"
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        print(f.read())
else:
    print(f"{env_path} does not exist")
