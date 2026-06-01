import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

stdin, stdout, stderr = client.exec_command("docker ps --format '{{.Names}}' | grep 'dashboard-middleware'")
MW = stdout.read().decode('utf-8').strip()

script = (
    "const { getPeriodRange, toSafeSqlString } = require('./src/utils/period');"
    "const anchor = new Date('2025-12-31T12:00:00');"
    "const pr = getPeriodRange('thisMonth', null, null, anchor);"
    "console.log('pr.start:', pr.start);"
    "const startObj = new Date(pr.start);"
    "console.log('startObj:', startObj.toString());"
    "console.log('toSafeSqlString(startObj):', toSafeSqlString(startObj));"
)

cmd = f"docker exec {MW} node -e \"{script}\" 2>&1"
stdin, stdout, stderr = client.exec_command(cmd)
print("=== Output ===")
print(stdout.read().decode('utf-8'))

client.close()
