PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  high_contrast_enabled INTEGER NOT NULL DEFAULT 0 CHECK (high_contrast_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS pill_templates (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  shape TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT,
  divider TEXT NOT NULL DEFAULT 'none',
  svg_r2_key TEXT NOT NULL UNIQUE,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  dosage_label TEXT,
  instructions TEXT,
  schedule_json TEXT NOT NULL,
  template_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES pill_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  medication_id TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  taken_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('taken', 'missed', 'skipped')),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pill_templates_drug_name ON pill_templates(drug_name);
CREATE INDEX IF NOT EXISTS idx_pill_templates_public ON pill_templates(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dose_logs_user_scheduled ON dose_logs(user_id, scheduled_for DESC);

CREATE TABLE IF NOT EXISTS pet_stats (
  user_id TEXT PRIMARY KEY,
  pet_name TEXT NOT NULL DEFAULT 'Caterpillar',
  mood TEXT NOT NULL DEFAULT 'happy',
  energy INTEGER NOT NULL DEFAULT 100 CHECK (energy BETWEEN 0 AND 100),
  hunger INTEGER NOT NULL DEFAULT 0 CHECK (hunger BETWEEN 0 AND 100),
  consistency_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pet_stats_leaderboard ON pet_stats(consistency_streak DESC, best_streak DESC, updated_at ASC);

CREATE VIEW IF NOT EXISTS leaderboard_consistency AS
SELECT
  u.id AS user_id,
  u.display_name,
  p.consistency_streak,
  p.best_streak,
  p.updated_at
FROM pet_stats p
JOIN users u ON u.id = p.user_id
ORDER BY p.consistency_streak DESC, p.best_streak DESC, p.updated_at ASC;
