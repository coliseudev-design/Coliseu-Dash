import paramiko

def run_ssh_cmd(cmd):
    host = '177.39.17.7'
    user = 'root'
    password = '6EFBC!c0:wzr%Ij'

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password)
        stdin, stdout, stderr = client.exec_command(cmd)
        
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        
        print("STDOUT:")
        print(out)
        if err:
            print("STDERR:")
            print(err)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

# Find the middleware container and inspect all its env variables
run_ssh_cmd("docker inspect $(docker ps -q --filter name=dashboard-middleware) --format '{{range .Config.Env}}{{.}}{{printf \"\\n\"}}{{end}}'")
