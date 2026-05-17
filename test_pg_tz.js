const db = require('./middleware/src/db/postgres');
async function run() {
  try {
    const res1 = await db.query("SELECT '2026-05-01 00:00:00-03:00'::timestamp without time zone as t1");
    const res2 = await db.query("SELECT '2026-05-01 00:00:00Z'::timestamp without time zone as t2");
    const res3 = await db.query("SELECT '2026-05-01 00:00:00'::timestamp without time zone as t3");
    console.log(res1.rows[0].t1);
    console.log(res2.rows[0].t2);
    console.log(res3.rows[0].t3);
  } catch(e) { console.error(e); }
  process.exit(0);
}
run();
