const { pool } = require('./src/db/postgres');
(async () => {
    try {
        const res = await pool.query('SELECT id, email, tenant_id, layout_version, role FROM dash_usuarios LIMIT 10');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
