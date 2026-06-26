import psycopg2
from decimal import Decimal

CONN = "postgresql://postgres:0r0E6oV!qG3h@2.24.82.19:5432/coliseudash"
TENANT = "1ca30f62-4487-4103-b529-c6d7b041b245"

# Valores corretos do ERP (extraídos das imagens)
ERP = {
    "2026-06-01": Decimal("73131.16"),
    "2026-06-02": Decimal("72027.90"),
    "2026-06-03": Decimal("101117.04"),
    "2026-06-04": Decimal("321.00"),
    "2026-06-05": Decimal("76965.70"),
    "2026-06-06": Decimal("52996.35"),
    "2026-06-08": Decimal("49924.37"),
    "2026-06-09": Decimal("74591.49"),
    "2026-06-10": Decimal("102500.01"),
    "2026-06-11": Decimal("64853.19"),
    "2026-06-12": Decimal("129899.60"),
    "2026-06-13": Decimal("896.53"),
    "2026-06-15": Decimal("64827.29"),
    "2026-06-16": Decimal("108572.58"),
    "2026-06-17": Decimal("79868.95"),
    "2026-06-18": Decimal("71037.29"),
    "2026-06-19": Decimal("68468.84"),
    "2026-06-20": Decimal("35646.73"),
    "2026-06-22": Decimal("55800.83"),
    "2026-06-23": Decimal("71686.58"),
    "2026-06-24": Decimal("73317.10"),
    "2026-06-25": Decimal("38370.17"),
}

# Query do Dashboard — mesma fórmula usada no middleware
QUERY_DASH = """
SELECT
    TO_CHAR(COALESCE(data_vencimento, data_venda) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS dia,
    SUM(valor_total - COALESCE(valor_desconto, 0)) AS total_dash
FROM dash_vendas
WHERE
    tenant_id = %s
    AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
    AND COALESCE(data_vencimento, data_venda) < '2026-06-26'
    AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
    AND UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA'
GROUP BY 1
ORDER BY 1;
"""

# Query alternativa sem ajuste de timezone
QUERY_DASH_UTC = """
SELECT
    TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') AS dia,
    SUM(valor_total - COALESCE(valor_desconto, 0)) AS total_dash
FROM dash_vendas
WHERE
    tenant_id = %s
    AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
    AND COALESCE(data_vencimento, data_venda) < '2026-06-26'
    AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
    AND UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA'
GROUP BY 1
ORDER BY 1;
"""

try:
    conn = psycopg2.connect(CONN)
    cur = conn.cursor()

    print("=" * 80)
    print("AUDITORIA BRANDÃO — JUNHO 2026")
    print("ERP Total: R$ 1.466.820,70 | Dashboard: R$ 1.464.094,36")
    print("Diferença esperada: R$ 2.726,34")
    print("=" * 80)

    cur.execute(QUERY_DASH, (TENANT,))
    rows = cur.fetchall()
    dash_por_dia = {row[0]: Decimal(str(row[1])) for row in rows}

    print(f"\n{'DATA':<14} {'ERP':>14} {'DASH':>14} {'DIFF':>12} STATUS")
    print("-" * 70)

    divergencias = []
    total_erp = Decimal("0")
    total_dash = Decimal("0")

    # Todos os dias do ERP
    for dia, erp_val in sorted(ERP.items()):
        dash_val = dash_por_dia.get(dia, Decimal("0"))
        diff = dash_val - erp_val
        total_erp += erp_val
        total_dash += dash_val

        if abs(diff) > Decimal("0.05"):
            status = "❌ DIVERGE"
            divergencias.append((dia, erp_val, dash_val, diff))
        else:
            status = "✅ OK"

        print(f"{dia:<14} {erp_val:>14,.2f} {dash_val:>14,.2f} {diff:>+12,.2f}  {status}")

    # Dias no Dashboard que não estão no ERP (sem vendas no ERP = deveria ser 0)
    for dia, dash_val in sorted(dash_por_dia.items()):
        if dia not in ERP and abs(dash_val) > Decimal("0.05"):
            total_dash += dash_val
            diff = dash_val
            print(f"{dia:<14} {'0,00':>14} {dash_val:>14,.2f} {diff:>+12,.2f}  ⚠️  EXTRA NO DASH")
            divergencias.append((dia, Decimal("0"), dash_val, diff))

    print("-" * 70)
    diff_total = total_dash - total_erp
    print(f"{'TOTAL':<14} {total_erp:>14,.2f} {total_dash:>14,.2f} {diff_total:>+12,.2f}")

    print(f"\n{'='*80}")
    print(f"DIVERGÊNCIAS ENCONTRADAS: {len(divergencias)}")
    print(f"{'='*80}")

    if divergencias:
        for dia, erp_val, dash_val, diff in divergencias:
            print(f"\n📅 {dia} | ERP: R$ {erp_val:,.2f} | DASH: R$ {dash_val:,.2f} | DIFF: R$ {diff:+,.2f}")

            # Buscar detalhes das vendas desse dia
            cur.execute("""
                SELECT
                    id_firebird,
                    valor_total,
                    valor_desconto,
                    (valor_total - COALESCE(valor_desconto,0)) AS net,
                    especie,
                    status,
                    TO_CHAR(data_venda, 'YYYY-MM-DD HH24:MI') AS data_venda,
                    TO_CHAR(data_vencimento, 'YYYY-MM-DD HH24:MI') AS data_venc
                FROM dash_vendas
                WHERE
                    tenant_id = %s
                    AND COALESCE(data_vencimento, data_venda) >= %s::date
                    AND COALESCE(data_vencimento, data_venda) < (%s::date + INTERVAL '1 day')
                    AND UPPER(TRIM(status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')
                    AND UPPER(TRIM(COALESCE(especie, ''))) != 'GARANTIA'
                ORDER BY id_firebird
            """, (TENANT, dia, dia))

            vendas = cur.fetchall()
            print(f"   Vendas no Dashboard ({len(vendas)} registros):")
            for v in vendas:
                fb_id, vt, vd, net, esp, st, dv, dvc = v
                print(f"   ID:{fb_id:>6} | net:{net:>10,.2f} | {str(esp or '')[:30]:<30} | {st}")

    # Também mostrar garantias do período (que ERP pode incluir)
    print(f"\n{'='*80}")
    print("GARANTIAS NO PERÍODO (excluídas do cálculo atual):")
    cur.execute("""
        SELECT
            TO_CHAR(COALESCE(data_vencimento, data_venda), 'YYYY-MM-DD') AS dia,
            id_firebird,
            (valor_total - COALESCE(valor_desconto,0)) AS net,
            especie
        FROM dash_vendas
        WHERE
            tenant_id = %s
            AND COALESCE(data_vencimento, data_venda) >= '2026-06-01'
            AND COALESCE(data_vencimento, data_venda) < '2026-06-26'
            AND UPPER(TRIM(COALESCE(especie, ''))) = 'GARANTIA'
        ORDER BY 1, 2
    """, (TENANT,))
    garantias = cur.fetchall()
    total_garantias = Decimal("0")
    for g in garantias:
        print(f"   {g[0]} | ID:{g[1]:>6} | net:{g[2]:>10,.2f} | {g[3]}")
        total_garantias += Decimal(str(g[2]))
    print(f"   TOTAL GARANTIAS: R$ {total_garantias:,.2f}")

    conn.close()

except Exception as e:
    print(f"ERRO: {e}")
    import traceback
    traceback.print_exc()
