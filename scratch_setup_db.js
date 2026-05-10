const { Pool } = require('pg');
const pool = new Pool({
  user: 'coliseu',
  host: 'localhost',
  database: 'coliseu_dash',
  password: 'coliseu_password',
  port: 5432,
});
async function test() {
  try {
    const res = await pool.query("SELECT * FROM dash_produtos LIMIT 1");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
