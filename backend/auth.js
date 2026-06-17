const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_change_this_in_production';

async function register(email, password) {
  const hashed = await bcrypt.hash(password, 10);
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) throw new Error('User already exists');
  const result = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [email, hashed]
  );
  return { id: result.rows[0].id, email };
}

async function login(email, password) {
  const result = await db.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) throw new Error('Invalid credentials');
  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid credentials');
  const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  return { token, user: { id: user.id, email } };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { register, login, verifyToken };
