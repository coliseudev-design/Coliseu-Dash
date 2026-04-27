import os

paths = [
    'middleware/src/routes/estatisticas.js',
    'middleware/src/routes/ranking.js',
    'middleware/src/routes/clientes.js'
]

for p in paths:
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("status IS DISTINCT FROM 'CANCELADO'", "TRIM(status) IN ('FATURADO', 'FINALIZADO')")
    content = content.replace("v.status IS DISTINCT FROM 'CANCELADO'", "TRIM(v.status) IN ('FATURADO', 'FINALIZADO')")
    
    with open(p, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replaced all occurrences.")
