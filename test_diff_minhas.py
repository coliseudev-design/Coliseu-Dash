import re
import fdb

# Read C# code
with open('C:/Users/rober/.gemini/antigravity/scratch/Coliseu_Sales/ColiseuSales.Configurator/FirebirdBootstrapper.cs', 'r', encoding='utf-8') as f:
    cs = f.read()

m = re.search(r'\["MINHASVENDASR"\] = """(.*?)"""', cs, re.DOTALL)
expected_ddl = m.group(1)

conn = fdb.connect(dsn='localhost:C:/Coliseu/Data/PIVETA.FDB', user='SYSDBA', password='masterkey')
c = conn.cursor()
c.execute("SELECT RDB$PROCEDURE_SOURCE FROM RDB$PROCEDURES WHERE RDB$PROCEDURE_NAME = 'MINHASVENDASR'")
db_source = c.fetchone()[0]

def normalize(s):
    return re.sub(r'\s+', '', s).upper()

idx_r_n = expected_ddl.find('AS\r\n')
idx_n = expected_ddl.find('AS\n')
idx = idx_r_n if idx_r_n != -1 else idx_n

expected_body = expected_ddl[idx+2:] if idx != -1 else expected_ddl

n_exp = normalize(expected_body)
n_db = normalize(db_source)

print('LEN EXP:', len(n_exp))
print('LEN DB: ', len(n_db))
if n_exp != n_db:
    for i in range(min(len(n_exp), len(n_db))):
        if n_exp[i] != n_db[i]:
            print(f'Diff at {i}: EXP={n_exp[i]} DB={n_db[i]}')
            break
else:
    print('MATCH!')
