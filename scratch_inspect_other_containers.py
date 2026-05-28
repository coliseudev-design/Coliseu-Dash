import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== {cmd} ===")
    print(stdout.read().decode('utf-8'))

run_cmd("docker inspect api-nsnopymisrq9qphl5qjc3w5l-042333644905 --format '{{.Name}} {{range .Config.Env}}{{.}} {{end}}'")
run_cmd("docker inspect frontend-nsnopymisrq9qphl5qjc3w5l-042333666975 --format '{{.Name}} {{range .Config.Env}}{{.}} {{end}}'")
client.close()
