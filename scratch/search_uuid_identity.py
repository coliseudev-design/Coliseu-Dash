import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

search_uuid = 'ce3067f6-04a3-4b6c-a1b8-6aa47f24aad6'

sql = f"""
DO $$
DECLARE
    r RECORD;
    val_count INTEGER;
BEGIN
    FOR r IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND (data_type = 'uuid' OR data_type = 'character varying' OR data_type = 'text')
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I::text = %L', r.table_name, r.column_name, {repr(search_uuid)}) INTO val_count;
            IF val_count > 0 THEN
                RAISE NOTICE 'Found in table: %, column: %, count: %', r.table_name, r.column_name, val_count;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Skip errors for incompatible columns/tables
        END;
    END LOOP;
END $$;
"""

script = f'''docker exec -i coliseu-db-thyqkc5gkvp7i1nld555wakz-172547374937 psql -U coliseu_admin -d coliseu_identity << 'EOF'
{sql}
EOF
'''

print("Executando busca por UUID...")
stdin, stdout, stderr = client.exec_command(script)
print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
client.close()
