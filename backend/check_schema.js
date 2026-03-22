const { pool } = require('./src/config/database');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'gate_passes'")
  .then(r => {
    console.log("COLUMNS IN gate_passes:");
    console.log(r.rows.map(c => c.column_name).sort().join('\n'));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
