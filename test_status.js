const db = require('./middleware/src/db/postgres');
async function run() {
    try {
        const { rows } = await db.query('SELECT DISTINCT status FROM dash_vendas');
        console.log("Distinct statuses:", rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
