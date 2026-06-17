const axios = require('axios');
const db = require('./db');

// Configuration
const HF_API_KEY = process.env.HF_API_KEY || null;
const HF_MODEL = process.env.HF_MODEL || 'distilbert-base-uncased-finetuned-sst-2-english'; // sentiment model
const HF_TIMEOUT = 5000;

// Fallback heuristic (same as before)
function heuristicScore(assetType, metadata) {
  let score = 50;
  if (assetType === 'email') {
    const subject = metadata.subject || '';
    if (/receipt|invoice/i.test(subject)) score += 20;
    if (/family|friend/i.test(subject)) score += 15;
    if (metadata.date) {
      const age = (Date.now() - new Date(metadata.date).getTime()) / (1000*60*60*24);
      if (age < 30) score += 10;
    }
  } else if (assetType === 'photo') {
    if (metadata.mediaMetadata?.width && metadata.mediaMetadata.width > 2000) score += 15;
    if (metadata.mediaMetadata?.creationTime) {
      const age = (Date.now() - new Date(metadata.mediaMetadata.creationTime).getTime()) / (1000*60*60*24);
      if (age < 30) score += 20;
    }
  } else if (assetType === 'drive') {
    if (metadata.mimeType?.includes('document')) score += 15;
    if (metadata.modifiedTime) {
      const age = (Date.now() - new Date(metadata.modifiedTime).getTime()) / (1000*60*60*24);
      if (age < 30) score += 10;
    }
  } else if (assetType === 'local') {
    const name = metadata.name || '';
    if (/screenshot|temp|tmp|thumbs/i.test(name)) score -= 20;
    if (metadata.extension && /\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(metadata.extension)) score += 10;
    if (metadata.extension && /\.(log|tmp|cache|temp)$/i.test(metadata.extension)) score -= 15;
  }
  return Math.min(100, Math.max(0, score));
}

// HuggingFace API call
async function hfScore(text) {
  if (!HF_API_KEY) return null;
  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      { inputs: text },
      {
        headers: { Authorization: `Bearer ${HF_API_KEY}` },
        timeout: HF_TIMEOUT,
      }
    );
    // Parse the response (adjust based on model)
    const result = response.data;
    if (Array.isArray(result)) {
      // For sentiment models, return a score from 0-100 based on sentiment
      const positive = result[0].filter(r => r.label === 'POSITIVE');
      if (positive.length > 0) {
        return Math.round(positive[0].score * 100);
      }
    }
    return null;
  } catch (err) {
    console.warn('HF API error:', err.message);
    return null;
  }
}

// Main scoring function
async function scoreAsset(assetId, userId, assetType, metadata, contentText = '') {
  // Try AI first
  let aiScore = null;
  if (contentText && HF_API_KEY) {
    const text = contentText.slice(0, 512); // limit length
    aiScore = await hfScore(text);
  }

  // Use heuristic if AI failed or no text
  const finalScore = aiScore !== null ? aiScore : heuristicScore(assetType, metadata);

  // Store the score in the database
  await db.query(
    `UPDATE asset_scores 
     SET emotional_score = $1, utility_score = $2, time_score = $3, 
         quality_score = $4, redundancy_score = $5, final_meaning_score = $6,
         computed_at = NOW()
     WHERE asset_id = $7`,
    [
      Math.round(finalScore * 0.3),
      Math.round(finalScore * 0.3),
      Math.round(finalScore * 0.2),
      Math.round(finalScore * 0.1),
      Math.round(finalScore * 0.1),
      finalScore,
      assetId,
    ]
  );

  return { score: finalScore, source: aiScore !== null ? 'AI' : 'heuristic' };
}

module.exports = { scoreAsset, heuristicScore };
