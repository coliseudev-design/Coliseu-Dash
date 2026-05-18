const fs = require('fs');

const biPath = 'middleware/src/routes/bi.js';
let biContent = fs.readFileSync(biPath, 'utf8');

// The strategy is to subtract the devolucao_total from faturamento_total in sales/executive-summary.
// Wait, I will just use regex or replace blocks for bi.js.
