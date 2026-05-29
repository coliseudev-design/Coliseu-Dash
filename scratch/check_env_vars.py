import os

for k, v in os.environ.items():
    if any(term in k.upper() for term in ["PG_", "DATABASE", "VET", "DB", "HOST", "PORT"]):
        print(f"{k}={v}")
