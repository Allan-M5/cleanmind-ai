const db = require('./db');
require('dotenv').config();

const createTables = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      provider_name VARCHAR(50) NOT NULL,
      encrypted_access_token TEXT NOT NULL,
      encrypted_refresh_token TEXT NOT NULL,
      token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT unique_user_provider UNIQUE(user_id, provider_name)
    );

    CREATE TABLE IF NOT EXISTS digital_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      external_id VARCHAR(512) NOT NULL,
      asset_type VARCHAR(50) NOT NULL,
      content_hash VARCHAR(64),
      origin_created_at TIMESTAMP WITH TIME ZONE,
      mime_type VARCHAR(100),
      file_size_bytes BIGINT DEFAULT 0,
      current_state VARCHAR(50) NOT NULL DEFAULT 'KEEP',
      vault_entered_at TIMESTAMP WITH TIME ZONE NULL,
      is_scheduled_for_purge BOOLEAN DEFAULT FALSE,
      CONSTRAINT unique_user_external_id UNIQUE(user_id, external_id)
    );

    CREATE TABLE IF NOT EXISTS asset_scores (
      asset_id UUID PRIMARY KEY REFERENCES digital_assets(id) ON DELETE CASCADE,
      emotional_score SMALLINT NOT NULL DEFAULT 0,
      utility_score SMALLINT NOT NULL DEFAULT 0,
      time_score SMALLINT NOT NULL DEFAULT 0,
      quality_score SMALLINT NOT NULL DEFAULT 0,
      redundancy_score SMALLINT NOT NULL DEFAULT 0,
      final_meaning_score SMALLINT NOT NULL DEFAULT 0,
      calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cleaning_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      cron_expression VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      last_run_at TIMESTAMP WITH TIME ZONE,
      next_run_at TIMESTAMP WITH TIME ZONE NOT NULL
    );
  `;

  try {
    await db.query(sql);
    console.log('? Tables created (or already exist).');
    process.exit(0);
  } catch (err) {
    console.error('? Migration failed:', err);
    process.exit(1);
  }
};

createTables();
