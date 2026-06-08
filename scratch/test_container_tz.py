import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')
cmd = 'docker exec dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-203733456093 node -e "const db = require(\'./src/db/postgres\'); db.query(\'SELECT NOW() as now, CURRENT_SETTING(\\\'timezone\\\') as tz\').then(r => { console.log(r.rows[0]); process.exit(0); }).catch(e => { console.error(e); process.exit(1); })"'
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:", stdout.read().decode('utf-8'))
print("STDERR:", stderr.read().decode('utf-8'))
client.close()
