const fs = require('fs');

const lines = fs.readFileSync('middleware/src/routes/bi.js', 'utf8').split('\n');

lines.forEach((line, idx) => {
    if (line.includes('router.get') || line.includes('router.post') || line.includes('dashboard-data') || line.includes('executive-summary')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
