import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('2.24.82.19', username='root', password='Col@13894645', timeout=10)

def write_logs(container_name, filename, lines=200):
    cmd = f"docker logs --tail {lines} {container_name}"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"=== Logs for {container_name} ===\n")
        if out:
            f.write("STDOUT:\n")
            f.write(out)
            f.write("\n")
        if err:
            f.write("STDERR:\n")
            f.write(err)
            f.write("\n")
    print(f"Wrote logs for {container_name} to {filename}")

write_logs("dashboard-middleware-g115wwb76cltjli9wew0cgfi-125244749473", "scratch_dash_mw_logs.txt")
write_logs("nexus-middleware-br0y0d05a1fq8fpwppb3y5bb-135959644570", "scratch_nexus_mw_logs.txt")
write_logs("siscom-middleware-beu06p1qif1yllvfbjphk3ov-135931106591", "scratch_siscom_mw_logs.txt")
write_logs("identity-oqyafcbt0l2r7fit91zbev6h-134026443681", "scratch_identity_logs.txt")

client.close()
