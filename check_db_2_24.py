import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"=== {cmd} ===")
    if out:
        print(out)
    if err:
        print("ERR:", err)

# Query company details
tenant = '1e40d65f-4319-4c68-ae13-66223820c095'
run_cmd(f"docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -c \"SELECT '{tenant}' as tenant, 'dash_clientes' as table_name, COUNT(*) FROM dash_clientes WHERE tenant_id = '{tenant}' UNION ALL SELECT '{tenant}', 'dash_vendas', COUNT(*) FROM dash_vendas WHERE tenant_id = '{tenant}' UNION ALL SELECT '{tenant}', 'dash_vendas_itens', COUNT(*) FROM dash_vendas_itens WHERE tenant_id = '{tenant}'\"")

client.close()




