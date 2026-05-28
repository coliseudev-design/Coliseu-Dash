import os
import re

ip_pattern = re.compile(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}')
domain_pattern = re.compile(r'coliseusistemas\.com\.br')

for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'dist', '.vite', '.agent', 'backup')]
    for file in files:
        if file.endswith(('.py', '.js', '.ts', '.tsx', '.json', '.cs', '.md')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    ips = ip_pattern.findall(content)
                    domains = domain_pattern.findall(content)
                    if ips or domains:
                        print(f"File: {path}")
                        if ips:
                            print(f"  IPs: {set(ips)}")
                        if domains:
                            print(f"  Domains: {set(domains)}")
            except Exception as e:
                pass
