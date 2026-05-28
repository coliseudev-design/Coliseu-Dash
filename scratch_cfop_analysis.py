import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'
DB = r'C:\FBDATA\DBSISCOM.FDB'

def run_isql(label, sql):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252', errors='replace') as f:
        f.write(sql.strip() + ';\n')
        f.write('QUIT;\n')
        tmpfile = f.name
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, DB]
        r = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=30)
        print(f"\n=== {label} ===")
        out = r.stdout.strip()
        if out: print(out[:4000])
        err = r.stderr.strip()
        if err: print("ERR:", err[:300])
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
    finally:
        try: os.unlink(tmpfile)
        except: pass

# 1. Quais CFOPs a tbcadcfossaida tem com 'VENDA' para analisar o filtro do worker
run_isql("Todos CFOPs CONTENDO VENDA em tbcadcfossaida",
"SELECT cfoestadual, TRIM(descricao) as desc FROM tbcadcfossaida WHERE descricao CONTAINING 'VENDA' ORDER BY cfoestadual")

# 2. Checar se 5405 está como VENDA na tabela
run_isql("CFOP 5405 na tbcadcfossaida",
"SELECT cfoestadual, descricao FROM tbcadcfossaida WHERE cfoestadual = 5405 OR cfoestadual = '5405'")

# 3. Simular exatamente o filtro do worker:
#    - 'VENDA' na descrição
#    - Excluindo: TRANSFERENCIA, REMESSA, DEVOLUCAO, RETORNO, BRINDE, BONIF, INDENIZACAO, 
#      'SIMPLES FATURAMENTO', 'ENTREGA FUTURA', ENCOMENDA
#    - + forçados: 5108, 6108, 6102
#    - - excluídos: 5117, 6117
run_isql("CFOPs que passam pelo filtro worker (VENDA sem exclusoes)",
"""SELECT cfoestadual, TRIM(descricao) as desc FROM tbcadcfossaida 
WHERE descricao CONTAINING 'VENDA'
  AND descricao NOT CONTAINING 'TRANSFERENCIA'
  AND descricao NOT CONTAINING 'REMESSA'
  AND descricao NOT CONTAINING 'DEVOLUCAO'
  AND descricao NOT CONTAINING 'RETORNO'
  AND descricao NOT CONTAINING 'BRINDE'
  AND descricao NOT CONTAINING 'BONIF'
  AND descricao NOT CONTAINING 'INDENIZACAO'
  AND descricao NOT CONTAINING 'SIMPLES FATURAMENTO'
  AND descricao NOT CONTAINING 'ENTREGA FUTURA'
  AND descricao NOT CONTAINING 'ENCOMENDA'
  AND cfoestadual > 0
ORDER BY cfoestadual""")

# 4. Quantas vendas de Dez 2025 por CFOP individualmente
run_isql("Dez 2025 - Separado por CFOP 5102, 5405, 6102",
"""SELECT cfo, COUNT(*) AS qtd, SUM(vlrtotalnota) AS total
FROM tbnotassaida
WHERE cancelada = 0 AND codempresa = 1
  AND dataemissao >= '2025-12-01' AND dataemissao < '2026-01-01'
  AND cfo IN (5102, 5405, 6102)
GROUP BY cfo ORDER BY cfo""")

# 5. Verificar se middleware está aceitando com middleware local 
print("\n=== Verificando middleware /internal/sync/dash_vendas ===")
import urllib.request, json
try:
    req = urllib.request.Request(
        'http://localhost:3001/internal/sync/dash_vendas',
        method='POST',
        data=json.dumps({"rows": []}).encode(),
        headers={
            'Content-Type': 'application/json',
            'X-Tenant-Id': 'a822a7e7-fdd4-4483-bbb5-26587a72739f',
            'X-Internal-Api-Key': 'COL-YUZA-9WSK-TN88'
        }
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        print(f"Status: {resp.status}")
        print(resp.read().decode()[:300])
except Exception as e:
    print(f"Middleware ERRO: {e}")
