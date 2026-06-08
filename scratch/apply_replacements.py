import re

files_to_modify = [
    "middleware/src/routes/bi.js",
    "middleware/src/routes/estatisticas.js",
    "middleware/src/routes/ranking.js",
    "middleware/src/routes/financeiro.js",
    "middleware/src/routes/vendas.js",
    "middleware/src/db/views.sql"
]

def apply_replacements(filepath):
    print(f"Modifying {filepath}...")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Define replacement patterns
    # 1. v.data_venda -> COALESCE(v.data_vencimento, v.data_venda)
    # We must be careful to handle word boundaries or spaces/parentheses.
    # E.g. v.data_venda, v.data_venda >=, DATE(v.data_venda), etc.
    
    # We can do exact string replacements first:
    replacements = [
        # Explicit table aliases
        ("v.data_venda", "COALESCE(v.data_vencimento, v.data_venda)"),
        ("v2.data_venda", "COALESCE(v2.data_vencimento, v2.data_venda)"),
        
        # SQL clauses where data_venda is used without alias
        ("MAX(data_venda)", "MAX(COALESCE(data_vencimento, data_venda))"),
        ("DATE(data_venda)", "DATE(COALESCE(data_vencimento, data_venda))"),
        ("DATE_TRUNC('day', data_venda)", "DATE_TRUNC('day', COALESCE(data_vencimento, data_venda))"),
        ("DATE_TRUNC('month', data_venda)", "DATE_TRUNC('month', COALESCE(data_vencimento, data_venda))"),
        ("TO_CHAR(data_venda,", "TO_CHAR(COALESCE(data_vencimento, data_venda),"),
        ("EXTRACT(HOUR FROM data_venda)", "EXTRACT(HOUR FROM COALESCE(data_vencimento, data_venda))"),
        
        # Specific queries where data_venda is filtered directly without alias
        ("data_venda >= $2 AND data_venda <= $3", "COALESCE(data_vencimento, data_venda) >= $2 AND COALESCE(data_vencimento, data_venda) <= $3"),
        ("data_venda >= $2 AND data_venda <= $3", "COALESCE(data_vencimento, data_venda) >= $2 AND COALESCE(data_vencimento, data_venda) <= $3"),
        ("data_venda >= NOW() - INTERVAL '30 days'", "COALESCE(data_vencimento, data_venda) >= NOW() - INTERVAL '30 days'"),
    ]
    
    modified_content = content
    for old, new in replacements:
        # Avoid double replacing if we run it multiple times
        # E.g. do not replace if COALESCE(v.data_vencimento is already there
        if old in modified_content:
            # We use a custom function to replace only if not already wrapped in COALESCE
            # But a simple regex or check can work:
            if "COALESCE" in old:
                modified_content = modified_content.replace(old, new)
            else:
                # Replace only if it doesn't have COALESCE before it
                # For simplicity, we can do a find and replace, but check if the replacement is already done.
                # Let's check how many times the replacement is done.
                # Let's use regex to replace old with new only if not preceded by COALESCE(
                pattern = r"(?<!COALESCE\()(?<!COALESCE\(v\.)" + re.escape(old)
                modified_content = re.sub(pattern, new, modified_content)

    # Let's write a special fix for any residual issues
    # E.g. in views.sql, let's just do it directly
    if filepath.endswith("views.sql"):
        # Let's overwrite views.sql completely to be 100% correct and clean
        modified_content = """-- ================================================================
-- OTIMIZAÇÃO: Visões Materializadas para o Coliseu Dash
-- ================================================================

-- 1. Visão de Vendas Diárias
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dash_vendas_diario AS
SELECT 
    tenant_id, 
    DATE(COALESCE(data_vencimento, data_venda)) AS data_venda, 
    COALESCE(SUM(valor_total), 0) AS faturamento,
    COUNT(DISTINCT id_firebird) AS qtd_pedidos,
    COALESCE(SUM(valor_desconto), 0) AS total_descontos,
    COALESCE(AVG(valor_total), 0) AS ticket_medio
FROM dash_vendas
GROUP BY tenant_id, DATE(COALESCE(data_vencimento, data_venda));

-- Índice único essencial para permitir REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_vendas_diario ON mv_dash_vendas_diario(tenant_id, data_venda);

-- 2. Visão Financeira Diária
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dash_financeiro_diario AS
SELECT 
    tenant_id, 
    COALESCE(DATE(data_vencimento), DATE(data_emissao)) AS data_ref,
    tipo,
    status_pagamento,
    COALESCE(SUM(valor), 0) AS valor_bruto,
    COALESCE(SUM(valor_pago), 0) AS valor_pago
FROM dash_financeiro
GROUP BY tenant_id, COALESCE(DATE(data_vencimento), DATE(data_emissao)), tipo, status_pagamento;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_financeiro_diario ON mv_dash_financeiro_diario(tenant_id, data_ref, tipo, status_pagamento);
"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(modified_content)
    print(f"Saved {filepath}")

for f in files_to_modify:
    apply_replacements(f)
