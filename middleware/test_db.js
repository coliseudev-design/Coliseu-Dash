require('dotenv').config();
const db = require('./src/db/postgres');

async function r() {
  const tenantId = 'ed1d3a98-4c4d-48db-99c0-8751926eb8e5';
  
  try {
    const { rows: v } = await db.query('SELECT COUNT(*) as c FROM dash_vendas WHERE tenant_id = $1', [tenantId]);
    console.log('Vendas:', v[0].c);

    const { rows: f } = await db.query('SELECT COUNT(*) as c FROM dash_financeiro WHERE tenant_id = $1', [tenantId]);
    console.log('Financeiro:', f[0].c);
    
    // Check Faturamento (A Receber)
    const { rows: fReceber } = await db.query(`SELECT COALESCE(SUM(valor - valor_pago),0) AS v FROM dash_financeiro WHERE tenant_id = $1 AND tipo = 'RECEBER' AND status_pagamento = 'ABERTO'`, [tenantId]);
    console.log('A receber:', fReceber[0].v);
    
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
r();
