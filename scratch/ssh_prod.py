import paramiko
import sys

def run_ssh_cmd(cmd):
    host = '2.24.82.19'
    user = 'root'
    password = 'Col@13894645'

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=user, password=password, timeout=10)
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

if __name__ == '__main__':
    run_ssh_cmd(sys.argv[1])
