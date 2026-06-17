const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'cleanmind_user',
  password: process.env.DB_PASSWORD || 'CleanMind@2026!',
  database: process.env.DB_NAME || 'cleanmind_db',
  connectionTimeoutMillis: 30000, // 30 seconds
  idleTimeoutMillis: 30000,
};

const pool = new Pool(config);

// Retry connection with exponential backoff
async function connectWithRetry(maxRetries = 5, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      console.log('✅ PostgreSQL connected successfully.');
      client.release();
      return true;
    } catch (err) {
      console.warn(`⚠️ DB connection attempt ${i + 1} failed: ${err.message}`);
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

// Expose a promise that resolves when connection is ready
const dbReady = connectWithRetry();

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

module.exports = { query, pool, dbReady };
