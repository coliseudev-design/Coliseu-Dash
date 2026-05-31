import paramiko
import sys

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'
CONTAINER = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-190813305525'

def run():
    # Read the javascript code
    with open('scratch/test_overview.js', 'r') as f:
        js_code = f.read()
    
    # We will write the code to a temporary file on the container, or pass it via stdin
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        
        # We can run node by passing code via stdin
        cmd = f"docker exec -i {CONTAINER} node -"
        stdin, stdout, stderr = client.exec_command(cmd)
        
        # Write code to stdin
        stdin.write(js_code)
        stdin.close()
        
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        
        print("STDOUT:")
        print(out)
        if err.strip():
            print("STDERR:")
            print(err)
            
    except Exception as e:
        print("ERROR:", e)
    finally:
        client.close()

if __name__ == '__main__':
    run()
