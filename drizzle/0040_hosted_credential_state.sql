-- Firebase owns passwords. D1 stores only a monotonic revocation fence, never
-- an ID/refresh token or password. Existing owners and learning rows are unchanged.
CREATE TABLE hosted_credential_states (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_updated_at INTEGER NOT NULL CHECK(password_updated_at >= 0),
  valid_since INTEGER NOT NULL CHECK(valid_since >= 0),
  observed_at INTEGER NOT NULL CHECK(observed_at >= 0)
);
