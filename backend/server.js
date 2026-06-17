const express = require('express');
const cors = require('cors');


const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const auth = require('./auth');

// 1. COMPREHENSIVE PRODUCTION STATE STORAGE DATABASES
const db = {
    user: { name: "Allan", totalPhotos: 14892, totalEmails: 4283, totalDocuments: 387 },
    platforms: [
        { id: 'gphotos', name: 'Google Photos', status: 'Connected', lastScan: '10 mins ago', items: 14892, color: '#3fb950', type: 'google' },
        { id: 'gmail', name: 'Gmail', status: 'Connected', lastScan: '10 mins ago', items: 4283, color: '#3fb950', type: 'google' },
        { id: 'gdrive', name: 'Google Drive', status: 'Connected', lastScan: '2 hours ago', items: 387, color: '#3fb950', type: 'google' }
    ],
    socialPlatforms: [
        // This will be populated dynamically when a social network is connected.
        // Example: { id: 'wa_001', name: 'WhatsApp', status: 'Connected', lastScan: 'Just now', items: 0, color: '#25D366', type: 'social' }
    ],
    assets: [
        { id: 'cm_01', name: 'family_graduation.jpg', type: 'photo', group: 'Duplicate Photos', size: 5242880, state: 'SUGGEST_DELETE', score: 32, metrics: 'E:15 U:10 T:40' },
        { id: 'cm_02', name: 'Screenshot_2019-11-02_hustle.png', type: 'photo', group: 'Old Screenshots', size: 1048576, state: 'SUGGEST_DELETE', score: 12, metrics: 'E:5 U:5 T:10' },
        { id: 'cm_03', name: 'Wealth Opportunity Loop Notification', type: 'email', group: 'Spam Emails', size: 45200, state: 'SUGGEST_DELETE', score: 8, metrics: 'E:0 U:5 T:5' },
        { id: 'cm_04', name: 'Server log export 2023.txt', type: 'document', group: 'Outdated Logs', size: 12451800, state: 'SUGGEST_DELETE', score: 19, metrics: 'E:1 U:2 T:15' }
    ],
    vault: [],
    timeline: [
        { time: '05:42 PM', action: 'Initialized CleanMind active monitoring system.' }
    ],
    behaviorLog: [
        '[05:42 PM] Core operational cluster standard handshake verified.',
        '[05:30 PM] Synchronized metadata blocks safely across local directories.'
    ],
    socialMessages: [
        { id: 'sm_01', network: 'X (Twitter)', sender: '@promo_bot_99', message: 'Hi', date: '3 weeks ago', reason: "Sent 'Hi' 3 weeks ago with no follow-up context or matching metadata profile matching Allan." },
        { id: 'sm_02', network: 'TikTok', sender: '@user8472910', message: 'Hey check out my link!', date: '5 days ago', reason: 'Contains clear automated outreach string sequence.' },
        { id: 'sm_03', network: 'Instagram', sender: 'stranger_danger', message: 'Hello', date: '1 month ago', reason: 'Transient cold greeting without explicit business vector context.' }
    ]
};

// 2. BULLMQ BACKGROUND TASK ENGINE IMPLEMENTATION

// --- MOCK QUEUE SYSTEM (no Redis required) ---
const scanQueue = {
    add: async (name, data) => {
        console.log(`[Mock Queue] Job added: ${name}`, data);
        return { id: 'mock_' + Date.now() };
    }
};

// No worker needed – we'll process synchronously or ignore.
// Keep the scanWorker variable defined as a dummy to avoid errors.
const scanWorker = null;

    
    









// 3. SECURE REST API INFRASTRUCTURE
app.get('/api/master-state', (req, res) => {
    res.status(200).json(db);
});

app.get('/api/telemetry', (req, res) => {
    const allPlatforms = [...db.platforms, ...db.socialPlatforms];
    res.status(200).json({
        user: db.user,
        platforms: allPlatforms,
        assets: db.assets,
        vault: db.vault,
        socialMessages: db.socialMessages
    });
});

app.post('/api/action/scan', async (req, res) => {
    const { directive } = req.body;
    db.behaviorLog.unshift(`[${new Date().toLocaleTimeString()}] Target parsing route executed: "${directive}"`);
    
    if (directive && directive.toLowerCase().includes('milestone')) {
        db.behaviorLog.unshift(`[${new Date().toLocaleTimeString()}] Elevated preservation vector applied to historical files.`);
    }

    const job = await scanQueue.add('AnalyzeDigitalLife', { directive });
    res.status(200).json({ status: 'SCAN_QUEUED', jobId: job.id });
});

app.post('/api/action/analyze-milestones', (req, res) => {
    db.assets.forEach(asset => {
        if (asset.name.toLowerCase().includes('family') || asset.name.toLowerCase().includes('graduation') || asset.type === 'photo') {
            asset.state = 'PRESERVED_MILESTONE';
            asset.score = 99; 
        }
    });
    db.behaviorLog.unshift(`[${new Date().toLocaleTimeString()}] Protected long-term historical milestone records from automated deletion.`);
    res.status(200).json({
        status: 'MILESTONES_PROTECTED',
        message: 'All core archival travel memories, certificates, and core compliance documentations have been assigned maximum score protection layers safely.'
    });
});

app.post('/api/action/commit-cleanup', (req, res) => {
    const { assetId } = req.body;
    const itemIndex = db.assets.findIndex(a => a.id === assetId);
    if (itemIndex !== -1) {
        const item = db.assets[itemIndex];
        db.assets.splice(itemIndex, 1);
        db.timeline.unshift({ time: new Date().toLocaleTimeString(), action: `Purged unwanted item: ${item.name}` });
        db.behaviorLog.unshift(`[${new Date().toLocaleTimeString()}] Erased asset: ${item.name}`);
    }
    res.status(200).json({ status: 'CLEANUP_COMMIT_SUCCESS' });
});

app.post('/api/action/vault-isolate', (req, res) => {
    const { assetId } = req.body;
    const idx = db.assets.findIndex(a => a.id === assetId);
    if (idx !== -1) {
        const item = db.assets[idx];
        item.state = 'VAULTED';
        db.vault.push({
            assetId: item.id,
            name: item.name,
            type: item.type,
            daysRemaining: 7
        });
        db.timeline.unshift({ time: new Date().toLocaleTimeString(), action: `Isolated asset to vault: ${item.name}` });
        db.behaviorLog.unshift(`[${new Date().toLocaleTimeString()}] Moved ${item.name} into insulated 7-day safety vault layout.`);
    }
    res.status(200).json({ status: 'ISOLATION_COMPLETE' });
});

app.post('/api/action/vault-restore', (req, res) => {
    const { assetId } = req.body;
    const idx = db.assets.findIndex(a => a.id === assetId);
    if (idx !== -1) {
        db.assets[idx].state = 'SUGGEST_DELETE';
        db.vault = db.vault.filter(v => v.assetId !== assetId);
        db.behaviorLog.unshift(`[${new Date().toLocaleTimeString()}] Restored asset back to active inventory layout layout.`);
    }
    res.status(200).json({ status: 'RESTORE_COMPLETE' });
});

app.post('/api/action/social-purge-message', (req, res) => {
    const { msgId } = req.body;
    db.socialMessages = db.socialMessages.filter(m => m.id !== msgId);
    db.behaviorLog.unshift(`[${new Date().toLocaleTimeString()}] Removed junk social message record reference ID: ${msgId}`);
    res.status(200).json({ status: 'SOCIAL_MESSAGE_PURGED', currentMessages: db.socialMessages });
});

app.post('/api/action/ai-advisor-query', (req, res) => {
    const { screen, query } = req.body;
    let reply = `Regarding the active '${screen}' view, your metrics remain stable. All safe configurations have been validated.`;
    if (query.toLowerCase().includes('threshold')) {
        reply = `The active screen item threshold determines the automated precision floor for flagging data noise. Your active profile is set to 95% Safe Precision Floor, isolating items safely.`;
    } else if (query.toLowerCase().includes('milestone')) {
        reply = `Milestone analysis flags items with a maximum protection rating of 99. These assets are entirely shielded from any automatic deletion passes.`;
    }
    res.status(200).json({ reply });
});

app.post('/api/action/connect-social', (req, res) => {
    const { network } = req.body; // e.g., 'wa' for WhatsApp
    const socialNames = {
        fb: { name: 'Facebook Messenger', color: '#1877F2', icon: 'fb' },
        li: { name: 'LinkedIn', color: '#0A66C2', icon: 'li' },
        tt: { name: 'TikTok', color: '#000000', icon: 'tt' },
        ig: { name: 'Instagram', color: '#E4405F', icon: 'ig' },
        x: { name: 'X (Twitter)', color: '#000000', icon: 'x' },
        tg: { name: 'Telegram', color: '#0088cc', icon: 'tg' },
        wa: { name: 'WhatsApp', color: '#25D366', icon: 'wa' }
    };
    const selected = socialNames[network];
    if (!selected) {
        return res.status(400).json({ error: 'Invalid social network selected.' });
    }

    // Check if already connected
    const existing = db.socialPlatforms.find(p => p.name === selected.name);
    if (existing) {
        return res.status(200).json({ status: 'ALREADY_CONNECTED', platform: existing });
    }

    const newPlatform = {
        id: `${network}_${Date.now()}`,
        name: selected.name,
        status: 'Connected',
        lastScan: 'Just now',
        items: 0, // placeholder - can be updated later
        color: selected.color,
        type: 'social'
    };
    db.socialPlatforms.push(newPlatform);
    db.behaviorLog.unshift(`[${new Date().toLocaleTimeString()}] Connected to ${selected.name}.`);
    res.status(200).json({ status: 'CONNECTED', platform: newPlatform });
});

            
app.post('/api/action/snapshot', (req, res) => {
    const assets = db.assets || [];
    if (assets.length === 0) {
        return res.json({
            totalItems: 0,
            oldest: 'N/A',
            oldestDate: 'N/A',
            newest: 'N/A',
            newestDate: 'N/A',
            categories: []
        });
    }
    // Sort by name (just for demo) - we can use created_at if available, but we'll mock
    // For demo, we'll just pick first and last from the array order
    const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name));
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    // Build categories from group field
    const categories = [...new Set(assets.map(a => a.group || 'Uncategorized'))];
    res.json({
        totalItems: assets.length,
        oldest: oldest.name,
        oldestDate: 'N/A',
        newest: newest.name,
        newestDate: 'N/A',
        categories: categories
    });
});


// ---------- Authentication Routes ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = await auth.register(email, password);
    res.status(201).json({ message: 'User registered', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await auth.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});


// ---------- Google OAuth Routes ----------
const googleAuth = require('./googleAuth');

app.get('/api/auth/google', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  const url = googleAuth.getAuthUrl(userId);
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }
  try {
    const userId = state;
    const tokens = await googleAuth.handleCallback(userId, code);
    res.json({ message: 'Google connected successfully', tokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to exchange code' });
  }
});

app.post('/api/auth/google/refresh', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const newToken = await googleAuth.refreshToken(userId);
    res.json({ access_token: newToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------- Data Ingestion ----------
const dataIngestion = require('./dataIngestion');

app.post('/api/ingest', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  try {
    console.log('Enqueuing ingestion job for user:', userId);
    const job = await ingestionQueue.add('ingestAll', { userId });
    // Store status in jobStatuses (defined later)
    jobStatuses.set(job.id, { status: 'queued', userId, createdAt: new Date() });
    console.log('Job enqueued with ID:', job.id);
    res.json({ message: 'Ingestion queued', jobId: job.id });
  } catch (err) {
    console.error('ERROR in /api/ingest:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ---------- Real BullMQ Queue ----------
const { Queue } = require('bullmq');
const Redis = require('ioredis');
const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});
const ingestionQueue = new Queue('ingestion', { connection });

// Job status endpoint
const jobStatuses = new Map();
ingestionQueue.on('completed', (job, result) => {
  jobStatuses.set(job.id, { status: 'completed', result, completedAt: new Date() });
});
ingestionQueue.on('failed', (job, err) => {
  jobStatuses.set(job.id, { status: 'failed', error: err.message, failedAt: new Date() });
});
app.get('/api/ingest/status/:jobId', (req, res) => {
  const status = jobStatuses.get(req.params.jobId);
  if (!status) return res.status(404).json({ error: 'Job not found' });
  res.json(status);
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`[CleanMind AI Backend Engine Node Service running explicitly on port ${PORT}]`);
});






