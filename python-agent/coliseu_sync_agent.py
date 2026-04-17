"""
===========================================================================
COLISEU SYNC AGENT
---------------------------------------------------------------------------
Lê dados do banco Firebird local e envia para a API Coliseu Dash via HTTPS.

Uso típico: rodar no Windows onde está o arquivo .FDB, como Windows Service
ou via Task Scheduler a cada X minutos.

Requisitos:
  - Python 3.9+
  - pip install fdb requests python-dotenv

Arquivo .env (mesma pasta do script):

  FIREBIRD_HOST=localhost
  FIREBIRD_PORT=3050
  FIREBIRD_DATABASE=C:\\PROJETOS COLISEU\\Bancodedados\\COMPENSADOSMAMA1203.FDB
  FIREBIRD_USER=SYSDBA
  FIREBIRD_PASSWORD=masterkey
  FIREBIRD_CHARSET=UTF8

  API_URL=https://coliseu-dash.pages.dev
  SYNC_API_KEY=coliseu-sync-key-dev-2026

  SYNC_BATCH_SIZE=500
  SYNC_INTERVAL_MINUTES=5

===========================================================================
"""
from __future__ import annotations

import logging
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Iterable

try:
    import fdb
except ImportError:
    fdb = None  # type: ignore

import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# -------- Configurações --------
FB_HOST = os.getenv("FIREBIRD_HOST", "localhost")
FB_PORT = int(os.getenv("FIREBIRD_PORT", "3050"))
FB_DATABASE = os.getenv("FIREBIRD_DATABASE", "")
FB_USER = os.getenv("FIREBIRD_USER", "SYSDBA")
FB_PASSWORD = os.getenv("FIREBIRD_PASSWORD", "masterkey")
FB_CHARSET = os.getenv("FIREBIRD_CHARSET", "UTF8")

API_URL = os.getenv("API_URL", "http://localhost:3000").rstrip("/")
SYNC_API_KEY = os.getenv("SYNC_API_KEY", "coliseu-sync-key-dev-2026")
BATCH_SIZE = int(os.getenv("SYNC_BATCH_SIZE", "500"))
SYNC_INTERVAL_MIN = int(os.getenv("SYNC_INTERVAL_MINUTES", "5"))

LOG_FILE = os.getenv("LOG_FILE", "coliseu_sync.log")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

# -------- Logging --------
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("coliseu-sync")

# ============================================================
# CONEXÃO FIREBIRD
# ============================================================
def connect_firebird():
    if fdb is None:
        log.error("Biblioteca 'fdb' não instalada. Rode: pip install fdb")
        sys.exit(1)
    if not FB_DATABASE:
        log.error("FIREBIRD_DATABASE não configurado no .env")
        sys.exit(1)
    log.info("Conectando ao Firebird: %s", FB_DATABASE)
    return fdb.connect(
        host=FB_HOST,
        port=FB_PORT,
        database=FB_DATABASE,
        user=FB_USER,
        password=FB_PASSWORD,
        charset=FB_CHARSET,
    )


# ============================================================
# MAPEAMENTO FIREBIRD → API
# ============================================================
# ATENÇÃO: As queries abaixo são SUGESTÕES baseadas em nomes de tabela
# comuns em sistemas ERP. Você PRECISA ADAPTAR às tabelas reais do seu
# Firebird (COMPENSADOSMAMA1203.FDB). Consulte um DBA/desenvolvedor
# para identificar as tabelas corretas.
#
# Cada função retorna uma lista de dicionários no formato exigido pela
# API do Coliseu Dash.


def fetch_clientes(cur) -> list[dict]:
    try:
        cur.execute("""
            SELECT CODCLIENTE, NOME, CNPJ_CPF, EMAIL, TELEFONE,
                   CIDADE, UF, DATACADASTRO, ATIVO
              FROM CLIENTES
             WHERE ATIVO = 'S' OR ATIVO = 1
        """)
        rows = []
        for r in cur.fetchall():
            rows.append({
                "id_firebird": r[0],
                "nome": (r[1] or "").strip(),
                "documento": r[2],
                "email": r[3],
                "telefone": r[4],
                "cidade": r[5],
                "estado": r[6],
                "data_cadastro": str(r[7]) if r[7] else None,
                "ativo": 1 if (r[8] in ('S', 1, True)) else 0,
            })
        return rows
    except Exception as e:
        log.warning("Falha ao ler CLIENTES: %s", e)
        return []


def fetch_produtos(cur) -> list[dict]:
    try:
        cur.execute("""
            SELECT CODPRODUTO, CODIGO, DESCRICAO, CATEGORIA,
                   PRECOVENDA, PRECOCUSTO, ESTOQUEATUAL, ESTOQUEMINIMO, ATIVO
              FROM PRODUTOS
        """)
        rows = []
        for r in cur.fetchall():
            rows.append({
                "id_firebird": r[0],
                "codigo": r[1],
                "nome": (r[2] or "").strip(),
                "categoria": r[3],
                "preco": float(r[4] or 0),
                "custo": float(r[5] or 0),
                "estoque": float(r[6] or 0),
                "estoque_minimo": float(r[7] or 0),
                "ativo": 1 if (r[8] in ('S', 1, True)) else 0,
            })
        return rows
    except Exception as e:
        log.warning("Falha ao ler PRODUTOS: %s", e)
        return []


def fetch_vendedores(cur) -> list[dict]:
    try:
        cur.execute("SELECT CODVENDEDOR, NOME, EMAIL, ATIVO FROM VENDEDORES")
        return [
            {
                "id_firebird": r[0],
                "nome": (r[1] or "").strip(),
                "email": r[2],
                "ativo": 1 if (r[3] in ('S', 1, True)) else 0,
            }
            for r in cur.fetchall()
        ]
    except Exception as e:
        log.warning("Falha ao ler VENDEDORES: %s", e)
        return []


def fetch_fornecedores(cur) -> list[dict]:
    try:
        cur.execute("""
            SELECT CODFORNECEDOR, NOME, CNPJ, CIDADE, UF FROM FORNECEDORES
        """)
        return [
            {
                "id_firebird": r[0],
                "nome": (r[1] or "").strip(),
                "documento": r[2],
                "cidade": r[3],
                "estado": r[4],
            }
            for r in cur.fetchall()
        ]
    except Exception as e:
        log.warning("Falha ao ler FORNECEDORES: %s", e)
        return []


def fetch_vendas(cur, desde: datetime | None = None) -> list[dict]:
    try:
        where = ""
        params: tuple = ()
        if desde:
            where = "WHERE DATAVENDA >= ?"
            params = (desde,)
        cur.execute(f"""
            SELECT CODPEDIDO, NUMEROPEDIDO, DATAVENDA, CODCLIENTE, CODVENDEDOR,
                   VALORTOTAL, VALORCUSTO, DESCONTO, STATUS
              FROM PEDIDOS
             {where}
        """, params)
        rows = []
        for r in cur.fetchall():
            dt = r[2]
            if isinstance(dt, datetime):
                dt_str = dt.strftime("%Y-%m-%d %H:%M:%S")
            else:
                dt_str = str(dt) if dt else None
            rows.append({
                "id_firebird": r[0],
                "numero_pedido": r[1],
                "data_venda": dt_str,
                "cliente_id": r[3],
                "vendedor_id": r[4],
                "valor_total": float(r[5] or 0),
                "valor_custo": float(r[6] or 0),
                "valor_desconto": float(r[7] or 0),
                "status": (r[8] or "FINALIZADO").upper(),
            })
        return rows
    except Exception as e:
        log.warning("Falha ao ler PEDIDOS: %s", e)
        return []


def fetch_financeiro(cur) -> list[dict]:
    """Lê contas a receber e a pagar."""
    try:
        # Contas a receber
        cur.execute("""
            SELECT CODTITULO, 'RECEBER', DESCRICAO, CODCLIENTE, NULL,
                   DATAEMISSAO, DATAVENCIMENTO, DATAPAGAMENTO,
                   VALOR, VALORPAGO, STATUSPAGAMENTO
              FROM CONTASRECEBER
            UNION ALL
            SELECT CODTITULO, 'PAGAR', DESCRICAO, NULL, CODFORNECEDOR,
                   DATAEMISSAO, DATAVENCIMENTO, DATAPAGAMENTO,
                   VALOR, VALORPAGO, STATUSPAGAMENTO
              FROM CONTASPAGAR
        """)
        rows = []
        for r in cur.fetchall():
            rows.append({
                "id_firebird": r[0],
                "tipo": r[1],
                "descricao": r[2],
                "cliente_id": r[3],
                "fornecedor_id": r[4],
                "data_emissao": str(r[5]) if r[5] else None,
                "data_vencimento": str(r[6]) if r[6] else None,
                "data_pagamento": str(r[7]) if r[7] else None,
                "valor": float(r[8] or 0),
                "valor_pago": float(r[9] or 0),
                "status_pagamento": (r[10] or "ABERTO").upper(),
            })
        return rows
    except Exception as e:
        log.warning("Falha ao ler Financeiro: %s", e)
        return []


# Mapa de sincronização — (nome_tabela_api, funcao_fetch)
SYNC_MAP: list[tuple[str, Callable[[Any], list[dict]]]] = [
    ("sync_clientes", fetch_clientes),
    ("sync_produtos", fetch_produtos),
    ("sync_vendedores", fetch_vendedores),
    ("sync_fornecedores", fetch_fornecedores),
    ("sync_vendas", fetch_vendas),
    ("sync_financeiro", fetch_financeiro),
    # TODO: adicionar fetch_compras, fetch_devolucoes, fetch_log_atividades,
    # fetch_comissoes, fetch_vendas_itens conforme tabelas reais do Firebird.
]


# ============================================================
# ENVIO PARA A API
# ============================================================
def chunks(iterable: list, size: int) -> Iterable[list]:
    for i in range(0, len(iterable), size):
        yield iterable[i:i + size]


def post_ingest(tabela: str, rows: list[dict]) -> dict:
    if not rows:
        return {"aplicados": 0, "recebidos": 0}
    url = f"{API_URL}/api/sync/ingest"
    total_aplicados = 0
    total_recebidos = 0
    total_erros = 0
    for batch in chunks(rows, BATCH_SIZE):
        payload = {"tabela": tabela, "rows": batch, "mode": "upsert"}
        try:
            r = requests.post(
                url,
                json=payload,
                headers={"X-Sync-Api-Key": SYNC_API_KEY},
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()
            total_aplicados += data.get("aplicados", 0)
            total_recebidos += data.get("recebidos", 0)
            total_erros += data.get("erros", 0)
        except requests.RequestException as e:
            log.error("Erro HTTP ao enviar %s: %s", tabela, e)
            total_erros += len(batch)
    return {
        "aplicados": total_aplicados,
        "recebidos": total_recebidos,
        "erros": total_erros,
    }


# ============================================================
# LOOP PRINCIPAL
# ============================================================
def sync_once() -> None:
    start = time.time()
    log.info("=" * 60)
    log.info("Iniciando ciclo de sincronização")
    try:
        conn = connect_firebird()
    except Exception as e:
        log.error("Falha na conexão Firebird: %s", e)
        return

    try:
        cur = conn.cursor()
        for tabela, fetch_fn in SYNC_MAP:
            try:
                rows = fetch_fn(cur)
                if not rows:
                    log.info("  %-22s → 0 registros (pulando)", tabela)
                    continue
                result = post_ingest(tabela, rows)
                log.info(
                    "  %-22s → %d enviados, %d aplicados, %d erros",
                    tabela, result["recebidos"], result["aplicados"], result["erros"],
                )
            except Exception as e:
                log.exception("Erro sincronizando %s: %s", tabela, e)
    finally:
        try:
            conn.close()
        except Exception:
            pass

    elapsed = time.time() - start
    log.info("Ciclo concluído em %.1fs", elapsed)


def main():
    log.info("╔══════════════════════════════════════════════════╗")
    log.info("║         COLISEU SYNC AGENT v2.0                  ║")
    log.info("╚══════════════════════════════════════════════════╝")
    log.info("API: %s", API_URL)
    log.info("Firebird: %s", FB_DATABASE)
    log.info("Intervalo: %d minutos", SYNC_INTERVAL_MIN)

    if "--once" in sys.argv:
        sync_once()
        return

    while True:
        try:
            sync_once()
        except Exception as e:
            log.exception("Erro no ciclo: %s", e)
        log.info("Próxima sincronização em %d minutos...", SYNC_INTERVAL_MIN)
        time.sleep(SYNC_INTERVAL_MIN * 60)


if __name__ == "__main__":
    main()
