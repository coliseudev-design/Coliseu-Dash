import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

DB_CONTAINER = "coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937"

sql_content = """
CREATE OR REPLACE FUNCTION trg_dash_financeiro_set_venda()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.venda_id_firebird IS NULL THEN
    SELECT id_firebird INTO NEW.venda_id_firebird
    FROM dash_vendas
    WHERE tenant_id = NEW.tenant_id
      AND cliente_id_firebird = NEW.cliente_id_firebird
      AND ABS(valor_total - COALESCE(valor_desconto, 0) - NEW.valor) < 0.01
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dash_financeiro_venda_link ON dash_financeiro;
CREATE TRIGGER trg_dash_financeiro_venda_link
BEFORE INSERT OR UPDATE ON dash_financeiro
FOR EACH ROW
EXECUTE FUNCTION trg_dash_financeiro_set_venda();

-- Force trigger calculation
UPDATE dash_financeiro 
SET venda_id_firebird = NULL 
WHERE venda_id_firebird IS NULL;
"""

sftp = client.open_sftp()
with sftp.open('/tmp/trigger.sql', 'w') as f:
    f.write(sql_content)
sftp.close()

client.exec_command(f"docker cp /tmp/trigger.sql {DB_CONTAINER}:/tmp/trigger.sql")

# Executar o arquivo SQL com psql
stdin, stdout, stderr = client.exec_command(f"docker exec {DB_CONTAINER} psql -U coliseu_admin -d coliseu_dashboard -f /tmp/trigger.sql")
print("=== SQL EXECUTION ===")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

# Limpar arquivos temporários
client.exec_command("rm /tmp/trigger.sql")
client.exec_command(f"docker exec {DB_CONTAINER} rm /tmp/trigger.sql")

client.close()
print("✅ Script finalizado!")
