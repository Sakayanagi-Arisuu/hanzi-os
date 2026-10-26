-- Descriptive bookmarks, reading positions and device-reported access days.
-- Tombstones are retained for cross-device deletes. No mastery projection reads this table.
CREATE TABLE IF NOT EXISTS learner_workspace_entries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reset_epoch INTEGER NOT NULL,
  entry_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  changed_at INTEGER NOT NULL,
  change_id TEXT NOT NULL,
  PRIMARY KEY (user_id, reset_epoch, entry_key)
);
