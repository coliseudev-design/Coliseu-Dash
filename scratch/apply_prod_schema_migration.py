import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)
    
    container = "vasjsucz4yxcb7m4rtqindd2"
    
    def run_query(sql, title):
        cmd = f'docker exec {container} psql -U coliseu_admin -d coliseu_dashboard -c "{sql}"'
        stdin, stdout, stderr = client.exec_command(cmd)
        print(f"=== {title} ===")
        print(stdout.read().decode('utf-8'))
        err = stderr.read().decode('utf-8')
        if err:
            print("ERR:", err)
            
    # Add columns es and processo to dash_vendas
    run_query(
        "ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS es INTEGER DEFAULT NULL; ALTER TABLE dash_vendas ADD COLUMN IF NOT EXISTS processo INTEGER DEFAULT NULL;",
        "Adding es and processo columns to dash_vendas"
    )
    
    # Verify columns are now present
    run_query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dash_vendas' AND column_name IN ('es', 'processo');",
        "Verification"
    )

except Exception as e:
    print("Error:", e)
finally:
    client.close()
