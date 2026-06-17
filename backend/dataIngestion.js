const { google } = require('googleapis');
const db = require('./db');
const googleAuth = require('./googleAuth');

const API_TIMEOUT = 30000;
const CONCURRENCY = 5;

function computeScore(item, type) {
  let score = 50;
  if (type === 'email') {
    const subject = item.subject || '';
    if (/receipt|invoice/i.test(subject)) score += 20;
    if (/family|friend/i.test(subject)) score += 15;
    if (item.date) {
      const age = (Date.now() - new Date(item.date).getTime()) / (1000*60*60*24);
      if (age < 30) score += 10;
    }
  } else if (type === 'photo') {
    if (item.mediaMetadata?.width && item.mediaMetadata.width > 2000) score += 15;
    if (item.mediaMetadata?.creationTime) {
      const age = (Date.now() - new Date(item.mediaMetadata.creationTime).getTime()) / (1000*60*60*24);
      if (age < 30) score += 20;
    }
  } else if (type === 'drive') {
    if (item.mimeType?.includes('document')) score += 15;
    if (item.modifiedTime) {
      const age = (Date.now() - new Date(item.modifiedTime).getTime()) / (1000*60*60*24);
      if (age < 30) score += 10;
    }
  }
  return Math.min(100, Math.max(0, score));
}

async function storeAsset(userId, externalId, assetType, name, metadata, rawDate) {
  const existing = await db.query(
    'SELECT id FROM digital_assets WHERE user_id = $1 AND external_id = $2 AND asset_type = $3',
    [userId, externalId, assetType]
  );
  if (existing.rows.length > 0) {
    console.log(`Asset ${externalId} already exists, skipping.`);
    return;
  }
  const result = await db.query(
    `INSERT INTO digital_assets
     (user_id, external_id, asset_type, content_hash, origin_created_at, mime_type, file_size_bytes, current_state)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [userId, externalId, assetType, null, rawDate, null, 0, 'KEEP']
  );
  const assetId = result.rows[0].id;
  const score = computeScore(metadata, assetType);
  await db.query(
    `INSERT INTO asset_scores (asset_id, emotional_score, utility_score, time_score, quality_score, redundancy_score, final_meaning_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [assetId, Math.floor(score*0.3), Math.floor(score*0.3), Math.floor(score*0.2), Math.floor(score*0.1), Math.floor(score*0.1), score]
  );
  return assetId;
}

// ---------- Gmail ----------
async function ingestGmail(userId, authClient) {
  const gmail = google.gmail({ version: 'v1', auth: authClient });
  let pageToken = null;
  let count = 0;
  do {
    console.log(`Fetching Gmail page (nextPageToken: ${pageToken || 'none'})...`);
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
      pageToken: pageToken,
      timeout: API_TIMEOUT
    });
    const messages = res.data.messages || [];
    if (messages.length === 0) break;

    const chunks = [];
    for (let i = 0; i < messages.length; i += CONCURRENCY) {
      chunks.push(messages.slice(i, i + CONCURRENCY));
    }
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'Date'],
            timeout: API_TIMEOUT
          });
          const headers = detail.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || null;
          const rawDate = date ? new Date(date) : null;
          await storeAsset(userId, msg.id, 'email', subject, { subject, date }, rawDate);
          count++;
        } catch (err) {
          console.error(`Error fetching detail for email ${msg.id}:`, err.message);
        }
      }));
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  console.log(`Gmail ingestion complete: ${count} emails.`);
  return count;
}

// ---------- Google Photos (with fallback) ----------
async function ingestPhotos(userId, authClient) {
  try {
    // Attempt to use the Photos API
    // Try multiple ways to instantiate
    let photos;
    try {
      photos = google.photoslibrary('v1');
      photos.auth = authClient;
    } catch (e1) {
      try {
        // Alternative: use the standalone if available
        const { photoslibrary } = require('@googleapis/photoslibrary');
        photos = photoslibrary({ version: 'v1', auth: authClient });
      } catch (e2) {
        throw new Error('Both photoslibrary methods failed: ' + e2.message);
      }
    }
    let pageToken = null;
    let count = 0;
    do {
      console.log(`Fetching Photos page (nextPageToken: ${pageToken || 'none'})...`);
      const res = await photos.mediaItems.list({
        pageSize: 100,
        pageToken: pageToken,
        timeout: API_TIMEOUT
      });
      const items = res.data.mediaItems || [];
      for (const item of items) {
        const rawDate = item.mediaMetadata?.creationTime ? new Date(item.mediaMetadata.creationTime) : null;
        await storeAsset(userId, item.id, 'photo', item.filename || 'unknown', item, rawDate);
        count++;
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
    console.log(`Photos ingestion complete: ${count} photos.`);
    return count;
  } catch (err) {
    console.warn('⚠️ Photos ingestion failed, skipping:', err.message);
    return 0; // fallback: return 0 so job doesn't fail
  }
}

// ---------- Google Drive ----------
async function ingestDrive(userId, authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  let pageToken = null;
  let count = 0;
  do {
    console.log(`Fetching Drive page (nextPageToken: ${pageToken || 'none'})...`);
    const res = await drive.files.list({
      pageSize: 100,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size)',
      pageToken: pageToken,
      timeout: API_TIMEOUT
    });
    const files = res.data.files || [];
    for (const file of files) {
      const rawDate = file.modifiedTime ? new Date(file.modifiedTime) : null;
      await storeAsset(userId, file.id, 'drive', file.name || 'unknown', file, rawDate);
      count++;
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  console.log(`Drive ingestion complete: ${count} files.`);
  return count;
}

// ---------- Main ----------
async function ingestAll(userId) {
  console.log(`Starting full ingestion for user ${userId}`);
  const authClient = await googleAuth.getAuthenticatedClient(userId);
  const emailCount = await ingestGmail(userId, authClient);
  const photoCount = await ingestPhotos(userId, authClient);
  const driveCount = await ingestDrive(userId, authClient);
  console.log(`All ingestion complete: ${emailCount} emails, ${photoCount} photos, ${driveCount} drive files.`);
  return { emailCount, photoCount, driveCount };
}

async function processIngestJob(job) {
  const { userId } = job.data;
  console.log(`Processing ingestion job for user ${userId}`);
  const result = await ingestAll(userId);
  return result;
}

module.exports = { ingestAll, processIngestJob };
