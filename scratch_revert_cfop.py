"""
REVERSÃO URGENTE - Restaurar o filtro original do cfop.js
O filtro de DEVOLUCAO DE CLIENTE estava CORRETO no original.
As devoluções devem entrar como negativo para descontar do faturamento.
"""
import paramiko, time

HOST = '2.24.82.19'
USER = 'root'
PASS = 'Col@13894645'
MW_CONTAINER = 'dashboard-middleware-g115wwb76cltjli9wew0cgfi-184215157942'
CFOP_PATH = '/usr/src/app/src/utils/cfop.js'

CFOP_ORIGINAL = """'use strict';

const db = require('../db/postgres');

// CFOPs válidos de venda (com nota fiscal emitida)
const SALES_CFOPS = [
    5101, 5102, 5103, 5104, 5105, 5106, 5109, 5110, 5111, 5112, 5113, 5114, 5115, 5116, 5118, 5119, 5120, 5122, 5123,
    5251, 5252, 5253, 5254, 5255, 5256, 5257, 5258,
    5401, 5402, 5403, 5405,
    6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6112, 6113, 6114, 6115, 6116, 6118, 6119, 6120, 6122, 6123,
    6251, 6252, 6253, 6254, 6255, 6256, 6257, 6258,
    6401, 6402, 6403, 6404
];

// CFOPs de devolução para desconto no faturamento líquido
const RETURN_CFOPS = [1201, 1202, 2201, 2202, 1411];

// Status excluídos do faturamento
const SALES_STATUS_EXCLUDE = [
    'CANCELADO', 'ABERTO', 'PENDENTE', 'ORÇAMENTO', 'ORCAMENTO', 'NULO', 'TESTE'
];

function isVetContext() {
    return false;
}

/**
 * STRICT_SALES_FILTER (CFOP): sem filtro de CFOP para Sistema Coliseu.
 */
function getCfopFilterClause(tableAlias = 'v') {
    return '';
}

/**
 * STATUS_FILTER para Sistema Coliseu (Layouts 1, 2 e 3):
 * Allowlist: inclui apenas FATURADO e FINALIZADO (status de venda concluída no ERP Coliseu).
 * Usa UPPER(TRIM()) para tolerância a espaços e variações de case.
 * Devoluções de cliente (espécie DEVOLUCAO DE CLIENTE) entram como valor negativo,
 * descontando do faturamento — comportamento idêntico ao ERP.
 * Apenas GARANTIA com valor negativo é excluída (são trocas sem efeito financeiro).
 */
function getStatusFilterClause(tableAlias = 'v') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return `AND UPPER(TRIM(${prefix}status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO') AND (UPPER(TRIM(COALESCE(${prefix}especie, ''))) != 'GARANTIA' OR (COALESCE(${prefix}valor_total, 0) - COALESCE(${prefix}valor_desconto, 0)) >= 0)`;
}

/**
 * STRICT_SALES_FILTER completo.
 * Use este em todas as queries de faturamento e ranking.
 */
function getSalesFilterClause(tableAlias = 'v') {
    return `${getCfopFilterClause(tableAlias)} ${getStatusFilterClause(tableAlias)}`;
}

module.exports = {
    SALES_CFOPS,
    RETURN_CFOPS,
    SALES_STATUS_EXCLUDE,
    isVetContext,
    getCfopFilterClause,
    getStatusFilterClause,
    getSalesFilterClause
};
"""

# Escrever o arquivo original localmente primeiro
with open('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js', 'w') as f:
    f.write(CFOP_ORIGINAL)
print("✅ cfop.js local restaurado ao original")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=20)

def run(client, cmd, desc=""):
    if desc: print(f"\n→ {desc}")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out: print(out)
    if err and 'WARN' not in err and 'level' not in err: print("ERR:", err)
    return out

# Enviar via SFTP
print("📁 Enviando cfop.js original via SFTP...")
sftp = client.open_sftp()
sftp.put('/Users/kleber/Documents/GitHub/Coliseu-Dash/middleware/src/utils/cfop.js', '/tmp/cfop_revert.js')
sftp.close()
print("✅ Arquivo enviado!")

# Verificar que NÃO tem mais DEVOLUCAO na exclusão
run(client, "grep 'NOT IN' /tmp/cfop_revert.js || echo 'OK - sem NOT IN'", "Verificando reversão")

# Copiar para o container
run(client, f"docker cp /tmp/cfop_revert.js {MW_CONTAINER}:{CFOP_PATH}", "Copiando para o container")

# Verificar no container
run(client, f"docker exec {MW_CONTAINER} grep 'getStatusFilter' -A2 {CFOP_PATH}", "Verificando filtro no container")

# Reiniciar
run(client, f"docker restart {MW_CONTAINER}", "Reiniciando middleware")

print("⏳ Aguardando 12s...")
time.sleep(12)

run(client, f"docker logs --tail 5 {MW_CONTAINER}", "Logs do middleware")

client.close()
print("\n✅ REVERSÃO CONCLUÍDA!")
