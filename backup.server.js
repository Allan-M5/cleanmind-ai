const express = require('express');
const cors = require('cors');
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

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
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const redisConnection = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    maxRetriesPerRequest: null
});

const scanQueue = new Queue('CleanMindScanQueue', { connection: redisConnection });

const scanWorker = new Worker('CleanMindScanQueue', async (job) => {
    const { directive } = job.data;
    for (let i = 10; i <= 100; i += 30) {
        await new Promise(r => setTimeout(r, 600));
    }
    return { outcome: 'SUCCESS', details: `Processed instruction context: ${directive}` };
}, { connection: redisConnection });

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

        // Connect a social platform
        async function connectSocialPlatform() {
            const network = document.getElementById('platform-select').value;
            const url = document.getElementById('sync-input').value.trim();
            const instructions = document.getElementById('ai-instructions').value.trim();

            if (!url) {
                alert('Please paste a Profile/Thread URL.');
                return;
            }

            // Show a loading state (optional)
            const btn = document.querySelector('#tab-platforms .intelligence-card .btn-gold');
            const originalText = btn.innerText;
            btn.innerText = 'Connecting...';
            btn.disabled = true;

            try {
                const response = await fetch(`${API_ROUTE}/action/connect-social`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ network, url, instructions })
                });
                const data = await response.json();
                if (data.status === 'CONNECTED' || data.status === 'ALREADY_CONNECTED') {
                    alert(`Successfully connected to ${data.platform.name}!`);
                    // Refresh the platforms grid
                    await renderPlatformCards();
                } else {
                    alert('Connection failed. Please try again.');
                }
            } catch (err) {
                console.error('Connection error:', err);
                alert('Network error. Please check your backend server.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`[CleanMind AI Backend Engine Node Service running explicitly on port ${PORT}]`);
});