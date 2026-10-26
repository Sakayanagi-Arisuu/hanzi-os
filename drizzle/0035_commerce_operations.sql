-- Additive merchant preparation and monetary ledger. Existing sandbox/Hanzi
-- rows stay untouched and are never imported as cash receipts.
CREATE TABLE commerce_merchant_settings (
 id INTEGER PRIMARY KEY CHECK(id=1),
 revision INTEGER NOT NULL DEFAULT 0,
 value_json TEXT NOT NULL CHECK(json_valid(value_json)),
 updated_at INTEGER NOT NULL,
 updated_by TEXT NOT NULL
);
INSERT INTO commerce_merchant_settings VALUES (1,0,'{"businessName":"HANZI.OS","supportEmail":"","website":"","refundPolicyUrl":"","provider":"bank_transfer","bankName":"","bankAccount":"","bankHolder":""}',0,'initial');

CREATE TABLE commerce_cash_orders (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id),
 plan_id TEXT NOT NULL CHECK(plan_id IN ('hsk4-month','hsk4-year')),
 amount INTEGER NOT NULL CHECK(typeof(amount)='integer' AND amount BETWEEN 1 AND 100000000),
 currency TEXT NOT NULL CHECK(currency='VND'),
 provider TEXT NOT NULL,
 provider_order_id TEXT,
 status TEXT NOT NULL CHECK(status IN ('pending','paid','failed','cancelled','refunded')),
 created_at INTEGER NOT NULL,
 paid_at INTEGER,
 UNIQUE(provider,provider_order_id)
);
CREATE INDEX commerce_cash_orders_user ON commerce_cash_orders(user_id,created_at);
CREATE TABLE commerce_cash_events (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES commerce_cash_orders(id),
 provider TEXT NOT NULL,
 provider_event_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('capture','refund','fee')),
 amount INTEGER NOT NULL CHECK(typeof(amount)='integer' AND amount BETWEEN 1 AND 100000000),
 occurred_at INTEGER NOT NULL,
 verified_at INTEGER NOT NULL,
 UNIQUE(provider,provider_event_id)
);
CREATE INDEX commerce_cash_events_date ON commerce_cash_events(occurred_at);
CREATE TRIGGER commerce_cash_event_immutable_update BEFORE UPDATE ON commerce_cash_events
 BEGIN SELECT RAISE(ABORT,'Cash events are immutable'); END;
CREATE TRIGGER commerce_cash_event_immutable_delete BEFORE DELETE ON commerce_cash_events
 BEGIN SELECT RAISE(ABORT,'Cash events are immutable'); END;
