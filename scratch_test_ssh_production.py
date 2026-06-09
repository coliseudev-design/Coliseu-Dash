import paramiko

def test_ssh(ip):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(ip, username='root', password='6EFBC!c0:wzr%Ij', timeout=5)
        print(f"✅ SUCCESS: SSH connected to {ip}")
        stdin, stdout, stderr = client.exec_command("hostname -I")
        print("IPs:", stdout.read().decode('utf-8').strip())
        client.close()
    except Exception as e:
        print(f"❌ FAILED: SSH to {ip} -> {e}")

test_ssh('2.24.82.19')
