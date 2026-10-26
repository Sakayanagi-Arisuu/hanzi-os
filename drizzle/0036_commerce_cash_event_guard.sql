CREATE TRIGGER commerce_cash_event_match BEFORE INSERT ON commerce_cash_events
 WHEN NOT EXISTS (SELECT 1 FROM commerce_cash_orders o WHERE o.id=NEW.order_id AND o.provider=NEW.provider)
 OR (NEW.kind='capture' AND (NEW.amount!=(SELECT amount FROM commerce_cash_orders WHERE id=NEW.order_id)
   OR EXISTS (SELECT 1 FROM commerce_cash_events WHERE order_id=NEW.order_id AND kind='capture')))
 OR (NEW.kind IN ('refund','fee') AND NEW.amount + COALESCE((SELECT SUM(amount) FROM commerce_cash_events WHERE order_id=NEW.order_id AND kind=NEW.kind),0)
   > COALESCE((SELECT SUM(amount) FROM commerce_cash_events WHERE order_id=NEW.order_id AND kind='capture'),0))
 BEGIN SELECT RAISE(ABORT,'Cash event does not match verified order'); END;
