import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

def run_cmd(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f"=== CMD: {cmd} ===")
    print(stdout.read().decode('utf-8'))
    err = stderr.read().decode('utf-8')
    if err:
        print("ERR:")
        print(err)

run_cmd("curl -I https://dashboard.coliseusistemas.com.br/")
run_cmd("curl -I http://localhost:3200/health/liveness")
client.close()
