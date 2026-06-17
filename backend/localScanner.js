const fs = require('fs').promises;
const path = require('path');
const db = require('./db');

// Generate a simple hash (placeholder – you can use crypto later)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Recursively scan a directory
async function scanDirectory(dirPath, basePath = null, options = {}) {
  const results = [];
  const errors = [];
  const startTime = Date.now();

  // Default options
  const maxDepth = options.maxDepth ?? Infinity;
  const extensions = options.extensions ?? null; // e.g., ['.jpg', '.pdf']
  const minSize = options.minSize ?? 0; // in bytes
  const maxSize = options.maxSize ?? Infinity;

  async function walk(currentPath, depth = 0) {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (err) {
      errors.push({ path: currentPath, error: err.message });
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = basePath ? path.relative(basePath, fullPath) : fullPath;

      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      // Filter by extension
      if (extensions) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!extensions.includes(ext)) continue;
      }

      let stats;
      try {
        stats = await fs.stat(fullPath);
      } catch (err) {
        errors.push({ path: fullPath, error: err.message });
        continue;
      }

      // Filter by size
      if (stats.size < minSize || stats.size > maxSize) continue;

      results.push({
        name: entry.name,
        path: fullPath,
        relativePath: relativePath,
        size: stats.size,
        mimeType: null, // we can add mime detection later
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isDirectory: false,
        extension: path.extname(entry.name).toLowerCase() || null,
        hash: simpleHash(fullPath + stats.size + stats.mtime.toISOString()),
      });
    }
  }

  await walk(dirPath);
  const duration = Date.now() - startTime;

  return {
    scannedPath: dirPath,
    totalFiles: results.length,
    errors: errors.length,
    durationMs: duration,
    files: results,
    errorsList: errors.slice(0, 20), // limit for response
  };
}

// Store scanned files as assets in the database
async function storeScannedFiles(userId, scanResults) {
  let inserted = 0;
  let skipped = 0;

  for (const file of scanResults.files) {
    // Check if already exists (using path + size + modified time as a simple dedupe)
    const existing = await db.query(
      `SELECT id FROM digital_assets 
       WHERE user_id = $1 AND external_id = $2 AND asset_type = 'local'`,
      [userId, file.hash]
    );

    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }

    const result = await db.query(
      `INSERT INTO digital_assets
       (user_id, external_id, asset_type, content_hash, origin_created_at, 
        mime_type, file_size_bytes, current_state, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        userId,
        file.hash,
        'local',
        file.hash,
        file.createdAt || new Date(),
        file.mimeType || null,
        file.size || 0,
        'KEEP',
        JSON.stringify({
          name: file.name,
          path: file.path,
          relativePath: file.relativePath,
          modifiedAt: file.modifiedAt,
          extension: file.extension,
        }),
      ]
    );

    // Insert a default score
    await db.query(
      `INSERT INTO asset_scores (asset_id, emotional_score, utility_score, 
        time_score, quality_score, redundancy_score, final_meaning_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [result.rows[0].id, 10, 10, 10, 10, 10, 50]
    );

    inserted++;
  }

  return { inserted, skipped };
}

module.exports = { scanDirectory, storeScannedFiles };
