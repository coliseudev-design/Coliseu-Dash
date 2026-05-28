import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

# Inspeciona o container do outro API e filtra variaveis de ambiente de PG
cmd = "docker inspect api-nsnopymisrq9qphl5qjc3w5l-042333644905 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -i 'PG_\\|DB_\\|CONN'"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Other API Env Variables ===")
print(stdout.read().decode('utf-8'))

client.close()
