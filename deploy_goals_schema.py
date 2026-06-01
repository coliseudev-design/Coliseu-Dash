import paramiko
import sys

HOST     = '177.39.17.7'
USER     = 'root'
PASSWORD = '6EFBC!c0:wzr%Ij'
DB_CONTAINER = 'coliseu-db'

# SQL to create the goals tables in PostgreSQL
SQL_COMMANDS = """
CREATE TABLE IF NOT EXISTS dash_metas_dashboard (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    id_firebird INTEGER NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    referencia_id INTEGER NOT NULL,
    data_referencia TIMESTAMPTZ NOT NULL,
    valor_meta DECIMAL(15,2) NOT NULL DEFAULT 0,
    periodo VARCHAR(20) DEFAULT 'mensal',
    sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, id_firebird)
);

CREATE TABLE IF NOT EXISTS dash_metas_vendedor_marca (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    id_firebird INTEGER NOT NULL,
    meta_vendedor_id INTEGER NOT NULL,
    marca_id INTEGER NOT NULL,
    valor_meta DECIMAL(15,2) NOT NULL DEFAULT 0,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    sincronizado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, id_firebird)
);

CREATE INDEX IF NOT EXISTS idx_dash_metas_ref ON dash_metas_dashboard(tenant_id, referencia_id);
CREATE INDEX IF NOT EXISTS idx_dash_metas_date ON dash_metas_dashboard(tenant_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_dash_metas_marca_parent ON dash_metas_vendedor_marca(tenant_id, meta_vendedor_id);
"""

def run(client, cmd, label=""):
    print(f"\n>>> {label or cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print("OUT:", out)
    if err: print("ERR:", err)
    return out, err

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("✓ Conectado à VPS")

        # Execute SQL commands in PostgreSQL
        # We write sql to a temporary file in VPS, then run it with psql, then delete it.
        sftp = client.open_sftp()
        temp_sql_path = '/tmp/goals_migration.sql'
        with sftp.open(temp_sql_path, 'w') as f:
            f.write(SQL_COMMANDS)
        sftp.close()
        
        # Run SQL via docker exec
        run_sql_cmd = f"docker exec -i {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard < {temp_sql_path}"
        run(client, run_sql_cmd, "Criando tabelas de metas no PostgreSQL")
        
        # Clean up temp sql file
        run(client, f"rm {temp_sql_path}", "Removendo arquivo SQL temporário")

        print("✓ Tabelas criadas com sucesso no PostgreSQL.")

    except Exception as e:
        print(f"Erro ao criar tabelas na VPS: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == '__main__':
    main()
