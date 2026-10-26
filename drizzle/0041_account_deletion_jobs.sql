-- No owner FK: a minimal hashed receipt must survive successful owner deletion.
CREATE TABLE account_deletion_jobs (
 id TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL UNIQUE,
 token_hash TEXT NOT NULL UNIQUE,
 project_id TEXT,
 firebase_uid TEXT,
 expected_email TEXT,
 status TEXT NOT NULL CHECK(status IN ('pending','provider_deleted','completed')),
 requested_at INTEGER NOT NULL,
 authenticated_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 completed_at INTEGER,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1000000),
 next_attempt_at INTEGER NOT NULL,
 last_error TEXT CHECK(last_error IS NULL OR last_error IN ('provider_unavailable','graph_unavailable','graph_blocked')),
 lease_token TEXT,
 lease_expires_at INTEGER,
 CHECK(authenticated_at<=requested_at AND requested_at<=updated_at AND requested_at<expires_at),
 CHECK((project_id IS NULL AND firebase_uid IS NULL AND expected_email IS NULL) OR (project_id IS NOT NULL AND firebase_uid IS NOT NULL AND expected_email IS NOT NULL)),
 CHECK((lease_token IS NULL AND lease_expires_at IS NULL) OR (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
 CHECK((status='completed' AND completed_at IS NOT NULL AND project_id IS NULL AND firebase_uid IS NULL AND expected_email IS NULL) OR (status<>'completed' AND completed_at IS NULL))
);
CREATE INDEX account_deletion_jobs_due ON account_deletion_jobs(status,next_attempt_at,lease_expires_at);
