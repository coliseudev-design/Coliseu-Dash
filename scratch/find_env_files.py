import os

for root, dirs, files in os.walk('.'):
    # skip .git, node_modules
    if '.git' in dirs:
        dirs.remove('.git')
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    for file in files:
        if file == '.env' or file.endswith('.env'):
            print(os.path.join(root, file))
