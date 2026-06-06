import paramiko, json, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')

MW = 'dashboard-middleware-irerzifjwjb4q8ucbpfk2gb8-182151991845'

def run(cmd):
    i,o,e = client.exec_command(cmd, timeout=20)
    return o.read().decode() + e.read().decode()

# Verificar status
print('Status:', run(f'docker ps --filter name={MW} --format "{{{{.Status}}}}"'))
print('Health:', run('curl -s http://127.0.0.1:33855/health/liveness 2>&1'))

# Gerar token
js_code = """const jwt=require('/usr/src/app/node_modules/jsonwebtoken');
const token=jwt.sign({tenantId:'a822a7e7-fdd4-4483-bbb5-26587a72739f',userId:247,module:'coliseu-dash',layoutVersion:'v1.0',useVetDb:false},process.env.JWT_DEVICE_KEY,{expiresIn:'1h'});
process.stdout.write('JWT:'+token+'\\n');"""

stdin, stdout, stderr = client.exec_command(f"docker exec -i {MW} sh -c 'cat > /tmp/gen_token.js'", timeout=10)
stdin.write(js_code)
stdin.channel.shutdown_write()
stdout.read(); stderr.read()

out = run(f'docker exec {MW} node /tmp/gen_token.js 2>&1')
token = None
for line in out.split('\n'):
    if line.startswith('JWT:'):
        token = line.replace('JWT:', '').strip()
        break

if not token:
    print('Erro ao gerar token:', out[:200])
    client.close()
    exit(1)

print(f'Token: {token[:40]}...')

# Testar overview com o fix
result = run(f'docker exec {MW} wget -qO- --header "Authorization: Bearer {token}" "http://127.0.0.1:3200/api/estatisticas/overview?period=thisMonth" 2>&1')
try:
    d = json.loads(result)
    print('\n=== RESULTADO OVERVIEW APOS FIX ===')
    print(f'hoje.total: {d.get("hoje", {}).get("total")}')
    print(f'hoje.qtd:   {d.get("hoje", {}).get("qtd")}')
    print(f'mes.total:  {d.get("mes", {}).get("total")}')
    print(f'mes.qtd:    {d.get("mes", {}).get("qtd")}')
    print(f'anterior.total: {d.get("anterior", {}).get("total")}')
    print(f'pedidos_abertos: {d.get("pedidos_abertos")}')
    print(f'pedidos_processados: {d.get("pedidos_processados")}')
    
    hoje = d.get("hoje", {}).get("total", 0)
    if hoje > 0:
        print(f'\n✅ SUCESSO! hoje.total = {hoje:.2f} (antes era 0)')
    else:
        print(f'\n⚠️  hoje.total ainda é {hoje}')
except Exception as e:
    print(f'Erro: {e}')
    print(result[:400])

# Login real para testar autenticacao completa
login_result = run(f'''docker exec {MW} wget -qO- --post-data='{{"email":"kleber@silenus.com.br","password":"qualquer"}}' --header='Content-Type: application/json' 'http://127.0.0.1:3200/api/auth/login' 2>&1''')
try:
    ld = json.loads(login_result)
    real_token = ld.get('token', '')
    if real_token:
        print('\n=== Teste com login real ===')
        result2 = run(f'docker exec {MW} wget -qO- --header "Authorization: Bearer {real_token}" "http://127.0.0.1:3200/api/estatisticas/overview?period=thisMonth" 2>&1')
        d2 = json.loads(result2)
        print(f'hoje.total: {d2.get("hoje", {}).get("total")}')
        print(f'mes.total:  {d2.get("mes", {}).get("total")}')
except:
    pass

client.close()
print('\n=== DONE ===')
