-- Preserve all existing wallet entries while extending the entry-kind constraint.
CREATE TABLE hanzi_wallet_entries_next (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  kind text NOT NULL CHECK(kind IN ('admin_credit','admin_debit','purchase','refund','verified_topup','level_reward')),
  reference_id text NOT NULL,
  actor_user_id text,
  created_at integer NOT NULL,
  CHECK(delta BETWEEN -1000000000 AND 1000000000 AND delta <> 0)
);
INSERT INTO hanzi_wallet_entries_next SELECT id,user_id,delta,kind,reference_id,actor_user_id,created_at FROM hanzi_wallet_entries;
DROP TABLE hanzi_wallet_entries;
ALTER TABLE hanzi_wallet_entries_next RENAME TO hanzi_wallet_entries;
CREATE UNIQUE INDEX hanzi_wallet_owner_reference ON hanzi_wallet_entries(user_id,reference_id);
CREATE INDEX hanzi_wallet_owner_created ON hanzi_wallet_entries(user_id,created_at);
-- Seed only an unconfigured monthly offer; preserve any admin-set price.
INSERT OR IGNORE INTO hanzi_plan_prices(plan_id,amount,updated_by,updated_at)
VALUES ('hsk4-month',1000,'system:level-rewards',1791291600000);
