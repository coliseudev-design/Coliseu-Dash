import re

with open('C:/Users/rober/.gemini/antigravity/scratch/Coliseu_Sales/ColiseuSales.Configurator/FirebirdBootstrapper.cs', 'r', encoding='utf-8') as f:
    cs = f.read()

m = re.search(r'\["L_VENDAS_PRODUTO"\] = """(.*?)"""', cs, re.DOTALL)
expected_ddl = m.group(1)

import fdb
conn = fdb.connect(dsn='localhost:C:/Coliseu/Data/PIVETA.FDB', user='SYSDBA', password='masterkey')
c = conn.cursor()
c.execute("SELECT RDB$VIEW_SOURCE FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'L_VENDAS_PRODUTO'")
row = c.fetchone()
db_source = row[0] if row else ''

def normalize(s):
    return re.sub(r'\s+', ' ', s).strip().upper()

name = 'L_VENDAS_PRODUTO'
pattern = r'CREATE\s+(?:OR\s+ALTER\s+)?VIEW\s+' + name + r'\s+AS\s*'
expected_body = re.sub(pattern, '', expected_ddl, count=1, flags=re.IGNORECASE | re.DOTALL)

n_exp = normalize(expected_body)
n_db = normalize(db_source)

print('LEN EXP:', len(n_exp))
print('LEN DB: ', len(n_db))
if n_exp != n_db:
    for i in range(min(len(n_exp), len(n_db))):
        if n_exp[i] != n_db[i]:
            print(f'Diff at {i}: EXP={n_exp[i:i+20]} DB={n_db[i:i+20]}')
            break
else:
    print('MATCH!')
