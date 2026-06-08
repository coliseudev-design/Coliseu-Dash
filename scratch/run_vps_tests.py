import paramiko
import os

HOST     = '177.39.17.7'
USER     = 'root'
PASSWORD = '6EFBC!c0:wzr%Ij'

def run(client, cmd, label=""):
    print(f"\n>>> {label or cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print("OUT:", out)
    if err: print("ERR:", err)
    return out, err

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("✓ Conectado à VPS")

        # 1. Encontrar o nome do container atual do middleware
        out, _ = run(client, 'docker ps --filter name=dashboard-middleware --format "{{.Names}}"', "Buscando container de middleware ativo")
        container_name = out.strip().split('\n')[0]
        if not container_name:
            print("Erro: Container de middleware não encontrado!")
            return
        print(f"Container ativo: {container_name}")

        # 2. Upload period.js local para temporário no VPS
        sftp = client.open_sftp()
        local_period = 'middleware/src/utils/period.js'
        sftp.put(local_period, '/tmp/period_test.js')
        
        # 3. Copiar para o container
        run(client, f"docker cp /tmp/period_test.js {container_name}:/usr/src/app/src/utils/period_test.js", "Copiando period_test.js para o container")
        
        # 4. Criar o script de teste para rodar no container
        test_script_content = """
const { getPeriodRange, parseDateString, toSafeSqlString } = require('./src/utils/period_test');

console.log("=== TESTANDO PARSE DATE STRING ===");
const d1 = parseDateString('2026-06-01');
console.log("parseDateString('2026-06-01') ->", d1.toISOString(), "should be 2026-06-01T00:00:00.000Z");

const d2 = parseDateString('2026-06-01 23:59:59');
console.log("parseDateString('2026-06-01 23:59:59') ->", d2.toISOString(), "should be 2026-06-01T23:59:59.000Z");

const d3 = parseDateString('2026-06-01', 'T23:59:59Z');
console.log("parseDateString('2026-06-01', 'T23:59:59Z') ->", d3.toISOString(), "should be 2026-06-01T23:59:59.000Z");

console.log("\\n=== TESTANDO TO SAFE SQL STRING ===");
console.log("toSafeSqlString(d1) ->", toSafeSqlString(d1), "should be 2026-06-01 00:00:00+00:00");
console.log("toSafeSqlString(d2) ->", toSafeSqlString(d2), "should be 2026-06-01 23:59:59+00:00");

console.log("\\n=== TESTANDO GET PERIOD RANGE ===");
const prToday = getPeriodRange('today', null, null, '2026-06-01 12:00:00');
console.log("getPeriodRange('today', anchor='2026-06-01 12:00:00') ->", prToday);

const prThisMonth = getPeriodRange('thisMonth', null, null, '2026-06-01 12:00:00');
console.log("getPeriodRange('thisMonth', anchor='2026-06-01 12:00:00') ->", prThisMonth);

const prCustom = getPeriodRange('custom', '2026-06-01', '2026-06-05');
console.log("getPeriodRange('custom', '2026-06-01', '2026-06-05') ->", prCustom);

console.log("\\n=== CONCLUÍDO ===");
"""
        # Escrever o script de teste no VPS temporário
        sftp_file = sftp.file('/tmp/test_period_vps.js', 'w')
        sftp_file.write(test_script_content)
        sftp_file.close()
        sftp.close()

        # Copiar o script de teste para o container
        run(client, f"docker cp /tmp/test_period_vps.js {container_name}:/usr/src/app/test_period_vps.js", "Copiando test_period_vps.js para o container")

        # 5. Executar o teste dentro do container usando node
        run(client, f"docker exec {container_name} node test_period_vps.js", "Executando testes com node no container")

        # 6. Cleanup no container e no VPS
        run(client, f"docker exec {container_name} rm /usr/src/app/src/utils/period_test.js /usr/src/app/test_period_vps.js", "Removendo arquivos de teste no container")
        run(client, "rm /tmp/period_test.js /tmp/test_period_vps.js", "Removendo arquivos temporários no VPS")

    except Exception as e:
        print(f"Erro: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
