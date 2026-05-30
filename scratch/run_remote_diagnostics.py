import paramiko
import json

def run_remote():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect('177.39.17.7', username='root', password='6EFBC!c0:wzr%Ij')
        print("Conectado ao SSH com sucesso!")
        
        fe_name = "dashboard-frontend-irerzifjwjb4q8ucbpfk2gb8-151703817606"
        
        # 1. Fazer login diretamente pelo nginx proxy (como o browser faz)
        print("\n--- LOGIN VIA NGINX PROXY ---")
        login_cmd = f"""docker exec {fe_name} wget -q -O - --post-data='{{"email":"coliseudev@gmail.com","password":"any"}}' --header='Content-Type: application/json' http://dashboard-middleware:3200/api/auth/login 2>&1"""
        stdin, stdout, stderr = client.exec_command(login_cmd)
        login_response = stdout.read().decode('utf-8')
        
        try:
            login_data = json.loads(login_response)
            token = login_data.get('token', '')
            print(f"Login OK, tenant: {login_data.get('user', {}).get('tenant_id')}")
            
            if token:
                # 2. Testar /api/sync/status via proxy interno
                print(f"\n--- TESTE /api/sync/status VIA PROXY ---")
                test_cmd = f"""docker exec {fe_name} wget -q -O - --header='Authorization: Bearer {token}' http://dashboard-middleware:3200/api/sync/status 2>&1"""
                stdin, stdout, stderr = client.exec_command(test_cmd)
                result = stdout.read().decode('utf-8')
                print(result[:500])
                
                # 3. Testar /api/estatisticas/kpis
                print(f"\n--- TESTE /api/estatisticas/kpis VIA PROXY ---")
                test_cmd2 = f"""docker exec {fe_name} wget -q -O - --header='Authorization: Bearer {token}' 'http://dashboard-middleware:3200/api/estatisticas/kpis?period=last12m' 2>&1"""
                stdin, stdout, stderr = client.exec_command(test_cmd2)
                result2 = stdout.read().decode('utf-8')
                print(result2[:500])
                
                # 4. Testar /api/ranking/vendedores
                print(f"\n--- TESTE /api/ranking/vendedores VIA PROXY ---")
                test_cmd3 = f"""docker exec {fe_name} wget -q -O - --header='Authorization: Bearer {token}' 'http://dashboard-middleware:3200/api/ranking/vendedores?period=last12m' 2>&1"""
                stdin, stdout, stderr = client.exec_command(test_cmd3)
                result3 = stdout.read().decode('utf-8')
                print(result3[:500])
        except json.JSONDecodeError:
            print(f"Login failed: {login_response[:200]}")

        # 5. Verificar se há containers mortos que podem interferir
        print("\n--- CONTAINERS MORTOS/PARADOS ---")
        stdin, stdout, stderr = client.exec_command("docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -v Up | grep -i 'middleware\\|frontend'")
        print(stdout.read().decode('utf-8'))

        # 6. Recarregar nginx no frontend para limpar cache de DNS
        print("\n--- RECARREGANDO NGINX NO FRONTEND ---")
        stdin, stdout, stderr = client.exec_command(f"docker exec {fe_name} nginx -s reload 2>&1")
        print(stdout.read().decode('utf-8'))
        print(stderr.read().decode('utf-8'))

    except Exception as e:
        print(f"Erro ao conectar ou executar comandos: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    run_remote()
