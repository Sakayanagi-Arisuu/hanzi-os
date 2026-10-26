import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { expect, it } from 'vitest';

it('preserves existing owners, Google sessions and pending challenges when adding GitHub', () => {
  const database = new DatabaseSync(':memory:');
  try {
    database.exec('PRAGMA foreign_keys=ON');
    for (const file of readdirSync('drizzle').filter(name => /^\d+.*\.sql$/u.test(name) && name < '0039').sort()) database.exec(readFileSync(`drizzle/${file}`, 'utf8'));
    database.exec(`INSERT INTO users(id,status,created_at,updated_at) VALUES('owner','active',100,100);
      INSERT INTO auth_identities(id,user_id,provider,provider_subject,email_verified,created_at,updated_at) VALUES('identity','owner','google','stable-subject',1,100,100);
      INSERT INTO auth_sessions(id,user_id,identity_id,token_hash,auth_method,authenticated_at,created_at,last_seen_at,expires_at) VALUES('session','owner','identity','existing-hash','google',100,100,100,999999);
      INSERT INTO auth_challenges(id,kind,provider,user_id,challenge_hash,created_at,expires_at) VALUES('pending','google_signin','google','owner','pending-hash',100,999999);`);
    database.exec(readFileSync('drizzle/0039_hosted_password_github.sql', 'utf8'));
    expect(database.prepare('SELECT token_hash,user_id FROM auth_sessions').get()).toMatchObject({ token_hash: 'existing-hash', user_id: 'owner' });
    expect(database.prepare('SELECT challenge_hash FROM auth_challenges').get()).toMatchObject({ challenge_hash: 'pending-hash' });
    expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    database.exec(`INSERT INTO auth_challenges(id,kind,provider,challenge_hash,created_at,expires_at) VALUES('github','github_signin','github','github-hash',100,999999)`);
  } finally { database.close(); }
});
