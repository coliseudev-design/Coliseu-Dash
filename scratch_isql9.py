import subprocess
import tempfile
import os

ISQL = r'C:\Program Files\Firebird\Firebird_2_5\bin\isql.exe'
DB = r'C:\FBDATA\DBSISCOM.FDB'

def run_isql(label, sql):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='cp1252') as f:
        f.write(sql + '\nEXIT;\n')
        tmpfile = f.name
    
    try:
        cmd = [ISQL, '-user', 'SYSDBA', '-password', 'masterkey', '-i', tmpfile, DB]
        result = subprocess.run(cmd, capture_output=True, encoding='cp1252', errors='replace', timeout=30)
        print(f"\n=== {label} ===")
        if result.stdout.strip():
            print(result.stdout[:5000])
        if result.stderr.strip():
            print("ERR:", result.stderr[:500])
    except subprocess.TimeoutExpired:
        print(f"\n=== {label} === [TIMEOUT]")
    except Exception as e:
        print(f"\n=== {label} === ERRO: {e}")
    finally:
        try:
            os.unlink(tmpfile)
        except:
            pass

# O worker usa queries do Firebird para preencher dash_vendas no PostgreSQL
# Verificar as tabelas de pedido de venda no Firebird que batem com o que foi sincronizado
# O PostgreSQL tem 348 pedidos com IDs tipo 17499, 17539, etc. para VetSeed em Dez 2025

# Verificar TBNOTASSAIDA - pedidos com CHAVE > 17000 (pois o PG tem id_firebird até ~17500)
run_isql("TBNOTASSAIDA - RANGE DE CHAVES (pedidos sincronizados)", """
SELECT MIN(CHAVE), MAX(CHAVE), COUNT(*)
FROM TBNOTASSAIDA
WHERE CODEMPRESA = 1;
""")

# O PG tem id_firebird de 17499 em Dez 2025. O Firebird deve ter CHAVE=17499 como nota de saída?
run_isql("TBNOTASSAIDA - CHAVE 17499 específica", """
SELECT CHAVE, NUMDOCUMENTO, DATAEMISSAO, VLRTOTALNOTA, CANCELADA
FROM TBNOTASSAIDA
WHERE CHAVE = 17499;
""")

# Verificar quantos registros de TBNOTASSAIDA não estão sincronizados (apenas Dez 2025)
# O PG tem MAX id_firebird = ?
run_isql("TBNOTASSAIDA - Dez 2025 por range de CHAVE", """
SELECT 
  CASE WHEN CHAVE <= 17599 THEN 'SINCRONIZADO (<=17599)' ELSE 'NAO SINCRONIZADO (>17599)' END as status,
  COUNT(*) as qtd,
  SUM(VLRTOTALNOTA) as total
FROM TBNOTASSAIDA
WHERE DATAEMISSAO >= '2025-12-01' AND DATAEMISSAO < '2026-01-01'
  AND CANCELADA = 0
GROUP BY CASE WHEN CHAVE <= 17599 THEN 'SINCRONIZADO (<=17599)' ELSE 'NAO SINCRONIZADO (>17599)' END;
""")

# Verificar qual é o maior id_firebird sincronizado no PG para VetSeed
# (Precisamos fazer isso no Postgres)
print("\n[INFO] Verificando max id_firebird no PostgreSQL via SSH...")

import paramiko
def pg_query(sql):
    host = '177.39.17.7'
    user = 'root'
    password = '6EFBC!c0:wzr%Ij'
    container = 'coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937'
    sql_escaped = sql.replace('"', '\\"')
    cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql_escaped}"'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password)
        _, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        return out, err
    finally:
        client.close()

TENANT_VETSEED = 'a822a7e7-fdd4-4483-bbb5-26587a72739f'

out, err = pg_query(f"""SELECT MIN(id_firebird), MAX(id_firebird), COUNT(*) FROM dash_vendas WHERE tenant_id = '{TENANT_VETSEED}'""")
print("PG - VetSeed min/max id_firebird e total:")
print(out)

out, err = pg_query(f"""
SELECT MIN(id_firebird), MAX(id_firebird), COUNT(*)
FROM dash_vendas
WHERE tenant_id = '{TENANT_VETSEED}'
  AND data_venda >= '2025-12-01' AND data_venda < '2026-01-01'
  AND TRIM(status) IN ('FATURADO', 'FINALIZADO')
""")
print("PG - VetSeed DEZ 2025 FATURADO min/max id_firebird:")
print(out)
