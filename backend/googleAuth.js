const { google } = require('googleapis');
const db = require('./db');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

function getAuthUrl(userId) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId,
    prompt: 'consent'
  });
}

async function handleCallback(userId, code) {
  const { tokens } = await oauth2Client.getToken(code);
  // Store tokens in database
  await db.query(
    `INSERT INTO user_tokens (user_id, provider, access_token, refresh_token, expiry_date)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, provider) DO UPDATE
     SET access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expiry_date = EXCLUDED.expiry_date`,
    [userId, 'google', tokens.access_token, tokens.refresh_token, tokens.expiry_date ? new Date(tokens.expiry_date) : null]
  );
  return tokens;
}

async function refreshToken(userId) {
  // Fetch refresh token from DB
  const result = await db.query(
    'SELECT refresh_token FROM user_tokens WHERE user_id = $1 AND provider = $2',
    [userId, 'google']
  );
  if (result.rows.length === 0) throw new Error('No refresh token found');
  const refreshToken = result.rows[0].refresh_token;
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  // Update tokens in DB
  await db.query(
    `UPDATE user_tokens
     SET access_token = $1, expiry_date = $2
     WHERE user_id = $3 AND provider = $4`,
    [credentials.access_token, new Date(credentials.expiry_date), userId, 'google']
  );
  return credentials.access_token;
}

async function getAuthenticatedClient(userId) {
  const result = await db.query(
    'SELECT access_token, refresh_token, expiry_date FROM user_tokens WHERE user_id = $1 AND provider = $2',
    [userId, 'google']
  );
  if (result.rows.length === 0) throw new Error('No tokens found for user');
  const { access_token, refresh_token, expiry_date } = result.rows[0];
  oauth2Client.setCredentials({
    access_token,
    refresh_token,
    expiry_date: expiry_date ? new Date(expiry_date).getTime() : undefined
  });
  // Check if token expired
  if (!oauth2Client.credentials.expiry_date || Date.now() >= oauth2Client.credentials.expiry_date) {
    // Refresh
    await refreshToken(userId);
    // Re-fetch new access token
    const newResult = await db.query(
      'SELECT access_token FROM user_tokens WHERE user_id = $1 AND provider = $2',
      [userId, 'google']
    );
    oauth2Client.setCredentials({ access_token: newResult.rows[0].access_token });
  }
  return oauth2Client;
}

module.exports = {
  getAuthUrl,
  handleCallback,
  refreshToken,
  getAuthenticatedClient
};
