const fs = require('fs');

let content = fs.readFileSync('middleware/src/routes/bi.js', 'utf8');

const target = `
        res.json({
            dna: {
                cliente_id: cliente.id_firebird,
                nome: cliente.nome,
                documento: cliente.documento,
                cidade: cliente.cidade,
                estado: cliente.estado,
                data_cadastro: cliente.data_cadastro,
                status: cliente.ativo ? "ATIVO" : "INATIVO",
                ltv
            },
            behavior: {
                produto_favorito: "Análise dinâmica pendente", // Requires complex join
                marca_favorita: "Análise dinâmica pendente",
                ticket_medio_historico,
                frequencia_dias: 30 // Mock
            },
            risk_assessment: {
                risco_churn_pct,
                tendencia: risco_churn_pct > 50 ? "QUEDA" : "CRESCIMENTO",
                ultima_compra,
                dias_sem_comprar
            },
            order_history: [] // Mock
        });
`;

const replacement = `
        // Vendedor Estrela
        const { rows: vendedores } = await db.query(\`
            SELECT vendedor, SUM(valor_total) as total_vendido
            FROM dash_vendas
            WHERE tenant_id = $1 AND cliente_id_firebird = $2 AND vendedor IS NOT NULL AND vendedor != ''
            GROUP BY vendedor
            ORDER BY total_vendido DESC
            LIMIT 1
        \`, [tenantId, searchId]);
        const vendedor_estrela = vendedores.length > 0 ? vendedores[0].vendedor : 'N/A';

        // Melhor Horário (Densidade)
        const { rows: heatmap } = await db.query(\`
            SELECT EXTRACT(HOUR FROM data_venda) as hora, COUNT(*) as qtd
            FROM dash_vendas
            WHERE tenant_id = $1 AND cliente_id_firebird = $2
            GROUP BY hora
            ORDER BY qtd DESC
            LIMIT 1
        \`, [tenantId, searchId]);
        const melhor_horario = heatmap.length > 0 ? \`\${String(heatmap[0].hora).padStart(2, '0')}:00\` : 'N/A';

        // Order History
        const { rows: history } = await db.query(\`
            SELECT id_firebird as id, numero_pedido as numero_nota, data_venda as data_emissao, vendedor as vendedor_nome, valor_total, status 
            FROM dash_vendas
            WHERE tenant_id = $1 AND cliente_id_firebird = $2
            ORDER BY data_venda DESC
            LIMIT 10
        \`, [tenantId, searchId]);

        res.json({
            dna: {
                cliente_id: cliente.id_firebird,
                nome: cliente.nome,
                documento: cliente.documento,
                cidade: cliente.cidade,
                estado: cliente.estado,
                data_cadastro: cliente.data_cadastro,
                status: cliente.ativo ? "ATIVO" : "INATIVO",
                ltv
            },
            behavior: {
                produto_favorito: "Análise dinâmica pendente",
                marca_favorita: "Análise dinâmica pendente",
                ticket_medio_historico,
                frequencia_dias: 30, // Mock
                melhor_horario
            },
            affinity: {
                vendedor_estrela
            },
            risk_assessment: {
                risco_churn_pct,
                tendencia: risco_churn_pct > 50 ? "QUEDA" : "CRESCIMENTO",
                ultima_compra,
                dias_sem_comprar
            },
            order_history: history.map(h => ({
                id: h.id,
                numero_nota: h.numero_nota,
                data_emissao: h.data_emissao ? new Date(h.data_emissao).toLocaleDateString('pt-BR') : '',
                vendedor_nome: h.vendedor_nome,
                valor_total: parseFloat(h.valor_total),
                status: h.status
            }))
        });
`;

if (content.includes(target.trim())) {
    content = content.replace(target.trim(), replacement.trim());
    fs.writeFileSync('middleware/src/routes/bi.js', content, 'utf8');
    console.log("bi.js radar-360 updated successfully!");
} else {
    console.log("Target not found in bi.js");
}
