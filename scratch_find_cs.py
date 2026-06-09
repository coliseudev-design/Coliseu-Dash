import os

for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith('.cs') or f.endswith('.csproj') or f.endswith('.sln'):
            print(os.path.join(root, f))
