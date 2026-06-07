import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

cmd = 'docker exec dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-203733456093 node -e "const db = require(\'./src/db/postgres\'); const { getPeriodRange } = require(\'./src/utils/period\'); db.dbContext.run({ dbType: \'main\', tzOffset: -240 }, () => { console.log(\'For offset -240 (UTC-4):\', getPeriodRange(\'today\')); }); db.dbContext.run({ dbType: \'main\', tzOffset: -180 }, () => { console.log(\'For offset -180 (UTC-3):\', getPeriodRange(\'today\')); }); db.dbContext.run({ dbType: \'main\', tzOffset: 0 }, () => { console.log(\'For offset 0 (UTC):\', getPeriodRange(\'today\')); });"'
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8'))
print("STDERR:")
print(stderr.read().decode('utf-8'))
client.close()
