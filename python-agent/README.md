# Coliseu Sync Agent

Agente Python que roda no **Windows onde está o Firebird** e sincroniza os dados com a API do **Coliseu Dash** (Cloudflare).

## Arquitetura

```
[Seu Windows]                       [Cloudflare]
Firebird .FDB ──► Python Agent ──► API /sync/ingest ──► D1 Database
                   (a cada 5min)    (HTTPS + API Key)
```

---

## Instalação no Windows

### 1. Requisitos

- **Windows** com Firebird rodando
- **Python 3.9+** ([download](https://www.python.org/downloads/))
- **Acesso ao arquivo .FDB** (com SYSDBA)

### 2. Copie os arquivos

Copie a pasta `python-agent/` para a máquina Windows, por exemplo em:

```
C:\coliseu-sync\
```

### 3. Instale dependências

Abra o `cmd` ou `PowerShell` como Administrador:

```bash
cd C:\coliseu-sync
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure o `.env`

Copie `.env.example` para `.env` e ajuste:

```ini
FIREBIRD_DATABASE=C:\PROJETOS COLISEU\Bancodedados\COMPENSADOSMAMA1203.FDB
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey

API_URL=https://coliseu-dash.pages.dev
SYNC_API_KEY=coliseu-sync-key-dev-2026

SYNC_INTERVAL_MINUTES=5
```

> ⚠️ **A SYNC_API_KEY** deve ser a mesma configurada no Cloudflare Pages (variável de ambiente `SYNC_API_KEY`).

### 5. Teste uma sincronização manual

```bash
python coliseu_sync_agent.py --once
```

Você verá no console:

```
╔══════════════════════════════════════════════════╗
║         COLISEU SYNC AGENT v2.0                  ║
╚══════════════════════════════════════════════════╝
API: https://coliseu-dash.pages.dev
Firebird: C:\PROJETOS COLISEU\Bancodedados\COMPENSADOSMAMA1203.FDB
...
  sync_clientes          → 120 enviados, 120 aplicados, 0 erros
  sync_produtos          → 45  enviados, 45  aplicados, 0 erros
  sync_vendas            → 900 enviados, 900 aplicados, 0 erros
  ...
Ciclo concluído em 3.2s
```

### 6. Rodar como daemon (loop contínuo)

```bash
python coliseu_sync_agent.py
```

O agente fica rodando e sincroniza a cada N minutos (configurável no `.env`).

---

## Opção A — Rodar como Windows Service

Use [NSSM](https://nssm.cc/) (Non-Sucking Service Manager):

```bash
# Baixe nssm.exe de https://nssm.cc/download
nssm install ColiseuSync "C:\coliseu-sync\venv\Scripts\python.exe" "C:\coliseu-sync\coliseu_sync_agent.py"
nssm set ColiseuSync AppDirectory "C:\coliseu-sync"
nssm set ColiseuSync DisplayName "Coliseu Dash Sync Agent"
nssm set ColiseuSync Start SERVICE_AUTO_START
nssm start ColiseuSync
```

Logs ficarão em `C:\coliseu-sync\coliseu_sync.log`.

---

## Opção B — Task Scheduler (a cada 5 min)

1. Abra **Agendador de Tarefas**
2. Criar Tarefa Básica → "Coliseu Sync"
3. Disparador: **A cada 5 minutos**
4. Ação: Iniciar programa:
   - Programa: `C:\coliseu-sync\venv\Scripts\python.exe`
   - Argumentos: `coliseu_sync_agent.py --once`
   - Iniciar em: `C:\coliseu-sync\`
5. Marcar "Executar com privilégios mais altos"

---

## ADAPTAÇÃO IMPORTANTE — Tabelas do Firebird

O arquivo `coliseu_sync_agent.py` contém queries **de exemplo** baseadas em nomes comuns:

| Tabela esperada   | Colunas lidas                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `CLIENTES`        | CODCLIENTE, NOME, CNPJ_CPF, EMAIL, TELEFONE, CIDADE, UF, DATACADASTRO, ATIVO                      |
| `PRODUTOS`        | CODPRODUTO, CODIGO, DESCRICAO, CATEGORIA, PRECOVENDA, PRECOCUSTO, ESTOQUEATUAL, ESTOQUEMINIMO, ATIVO |
| `VENDEDORES`      | CODVENDEDOR, NOME, EMAIL, ATIVO                                                                   |
| `FORNECEDORES`    | CODFORNECEDOR, NOME, CNPJ, CIDADE, UF                                                             |
| `PEDIDOS`         | CODPEDIDO, NUMEROPEDIDO, DATAVENDA, CODCLIENTE, CODVENDEDOR, VALORTOTAL, VALORCUSTO, DESCONTO, STATUS |
| `CONTASRECEBER`   | CODTITULO, DESCRICAO, CODCLIENTE, DATAEMISSAO, DATAVENCIMENTO, DATAPAGAMENTO, VALOR, VALORPAGO, STATUSPAGAMENTO |
| `CONTASPAGAR`     | CODTITULO, DESCRICAO, CODFORNECEDOR, DATAEMISSAO, DATAVENCIMENTO, DATAPAGAMENTO, VALOR, VALORPAGO, STATUSPAGAMENTO |

**Você deve ajustar** essas queries para bater com os nomes reais das tabelas/colunas do seu banco `COMPENSADOSMAMA1203.FDB`.

Como descobrir os nomes reais? Use o **IBExpert** ou **FlameRobin** para inspecionar o banco, ou execute:

```sql
SELECT RDB$RELATION_NAME
  FROM RDB$RELATIONS
 WHERE RDB$SYSTEM_FLAG = 0;
```

Depois edite as funções `fetch_*` em `coliseu_sync_agent.py`.

---

## Troubleshooting

### Erro: "Biblioteca fdb não instalada"
```bash
pip install fdb
```

### Erro: "Arithmetic exception, numeric overflow..."
Pode ser charset. Tente `FIREBIRD_CHARSET=WIN1252` no `.env`.

### Erro HTTP 401 (Chave de sincronização inválida)
Verifique se `SYNC_API_KEY` no `.env` bate com a variável do Cloudflare Pages.

### Performance lenta
- Aumente `SYNC_BATCH_SIZE` para 1000 ou 2000
- Adicione `WHERE DATAMODIFICACAO > ?` nas queries para sync incremental

---

## Logs

Os logs são escritos em `coliseu_sync.log` (mesmo diretório do script) e também no console.

Exemplo de log de sucesso:
```
2026-04-17 09:00:00 [INFO] Iniciando ciclo de sincronização
2026-04-17 09:00:01 [INFO]   sync_clientes          → 120 enviados, 120 aplicados, 0 erros
2026-04-17 09:00:02 [INFO]   sync_produtos          → 45 enviados, 45 aplicados, 0 erros
2026-04-17 09:00:03 [INFO] Ciclo concluído em 3.2s
```
