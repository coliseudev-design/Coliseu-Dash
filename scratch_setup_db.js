const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: './middleware/.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log('Adicionando coluna permissions...');
    await pool.query('ALTER TABLE dash_usuarios ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;');
    console.log('Coluna adicionada.');

    console.log('Criando usuário admin...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('13894645.', salt);
    
    const checkUser = await pool.query('SELECT id FROM dash_usuarios WHERE email = $1', ['admin@silenus.com.br']);
    if (checkUser.rowCount > 0) {
      await pool.query('UPDATE dash_usuarios SET senha_hash = $1, role = $2, permissions = NULL WHERE email = $3', [hash, 'master', 'admin@silenus.com.br']);
      console.log('Usuário admin já existia e foi atualizado com a nova senha.');
    } else {
      await pool.query(
        `INSERT INTO dash_usuarios (tenant_id, email, nome, role, ativo, senha_hash, permissions)
         VALUES ($1, $2, $3, $4, true, $5, NULL)`,
        ['00000000-0000-0000-0000-000000000000', 'admin@silenus.com.br', 'Admin Silenus', 'master', hash]
      );
      console.log('Usuário admin criado.');
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

run();
