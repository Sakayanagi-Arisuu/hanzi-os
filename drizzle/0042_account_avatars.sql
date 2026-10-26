-- Private account media is independent of learning reset and editorial assets.
CREATE TABLE learner_avatars (
 user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740990),
 updated_at INTEGER NOT NULL CHECK(updated_at BETWEEN 0 AND 8640000000000000),
 byte_length INTEGER NOT NULL CHECK(byte_length BETWEEN 0 AND 204800),
 content_sha256 TEXT,
 last_operation_id TEXT NOT NULL,
 last_request_sha256 TEXT NOT NULL CHECK(length(last_request_sha256)=64),
 write_nonce TEXT NOT NULL,
 CHECK((byte_length=0 AND content_sha256 IS NULL) OR (byte_length>0 AND content_sha256 IS NOT NULL AND length(content_sha256)=64))
);
CREATE TABLE learner_avatar_chunks (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740990),
 sequence INTEGER NOT NULL CHECK(sequence BETWEEN 0 AND 4),
 data_base64 TEXT NOT NULL CHECK(length(data_base64) BETWEEN 1 AND 65536),
 PRIMARY KEY(user_id,revision,sequence)
);
CREATE TABLE learner_avatar_mutations (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 operation_id TEXT NOT NULL,
 request_sha256 TEXT NOT NULL CHECK(length(request_sha256)=64),
 revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740990),
 PRIMARY KEY(user_id,operation_id)
);
