const { Pool } = require('pg');
// Explicitly load .env from the current directory
require('dotenv').config({ path: './.env' });

// Use environment variables, with hard-coded fallback for clarity
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'cleanmind_user',
  password: process.env.DB_PASSWORD || 'CleanMind@2026!',
  database: process.env.DB_NAME || 'cleanmind_db',
  connectionTimeoutMillis: 5000,
};

console.log('🔌 DB Config:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database,
  // password not logged for security
});

const pool = new Pool(config);

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection error:', err.stack);
  } else {
    console.log('✅ PostgreSQL connected successfully.');
    release();
  }
});

const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    console.log('Query executed:', text, params);
    return res;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
};

module.exports = { query };
