ALTER TABLE commerce_cash_orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE commerce_cash_orders ADD COLUMN bank_snapshot TEXT CHECK(bank_snapshot IS NULL OR json_valid(bank_snapshot));
ALTER TABLE commerce_cash_orders ADD COLUMN refund_requested_at INTEGER;
ALTER TABLE commerce_cash_orders ADD COLUMN refund_reason TEXT;
ALTER TABLE commerce_cash_orders ADD COLUMN bank_reference TEXT;
CREATE UNIQUE INDEX commerce_cash_order_idempotency ON commerce_cash_orders(user_id,idempotency_key);
CREATE UNIQUE INDEX commerce_cash_order_bank_reference ON commerce_cash_orders(provider,bank_reference) WHERE bank_reference IS NOT NULL;
