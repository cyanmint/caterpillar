-- Cloudflare D1 schema for Caterpillar medication adherence.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  accessibility_contrast TEXT NOT NULL DEFAULT 'high' CHECK (accessibility_contrast IN ('standard', 'high')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS pill_templates (
  id TEXT PRIMARY KEY,
  drug_name TEXT NOT NULL,
  normalized_drug_name TEXT NOT NULL,
  dosage_label TEXT NOT NULL,
  pills_per_box INTEGER NOT NULL CHECK (pills_per_box BETWEEN 1 AND 1000),
  shape TEXT NOT NULL CHECK (shape IN ('oblong', 'round', 'capsule', 'triangle')),
  primary_color TEXT NOT NULL,
  secondary_color TEXT,
  divider TEXT NOT NULL CHECK (divider IN ('none', 'half', 'quarter')),
  imprint TEXT,
  svg_text TEXT NOT NULL CHECK (length(svg_text) <= 64000),
  submitted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pill_template_id TEXT REFERENCES pill_templates(id) ON DELETE SET NULL,
  drug_name TEXT NOT NULL,
  dosage_label TEXT NOT NULL,
  pills_per_box INTEGER CHECK (pills_per_box BETWEEN 1 AND 1000),
  instructions TEXT,
  reminder_times_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS dose_events (
  id TEXT PRIMARY KEY,
  medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_for TEXT NOT NULL,
  taken_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'taken', 'missed', 'skipped')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS pet_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  pet_name TEXT NOT NULL DEFAULT 'Caterpillar',
  energy INTEGER NOT NULL DEFAULT 80 CHECK (energy BETWEEN 0 AND 100),
  happiness INTEGER NOT NULL DEFAULT 80 CHECK (happiness BETWEEN 0 AND 100),
  consistency_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_fed_at TEXT,
  mood TEXT NOT NULL DEFAULT 'happy' CHECK (mood IN ('happy', 'sleepy', 'sad', 'celebrating')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_medications_user_active ON medications(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dose_events_user_schedule ON dose_events(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_pill_templates_search ON pill_templates(normalized_drug_name, dosage_label, is_public);
CREATE INDEX IF NOT EXISTS idx_leaderboard_streak ON pet_stats(consistency_streak DESC, longest_streak DESC);
