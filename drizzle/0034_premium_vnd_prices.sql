-- Additive display pricing; no wallet, order or learner data is changed.
CREATE TABLE premium_vnd_prices (
 plan_id text PRIMARY KEY NOT NULL CHECK(plan_id IN ('hsk4-month','hsk4-year')),
 amount integer NOT NULL CHECK(typeof(amount) = 'integer' AND amount BETWEEN 1 AND 100000000),
 updated_by text NOT NULL,
 updated_at integer NOT NULL
);
INSERT INTO premium_vnd_prices VALUES
 ('hsk4-month',79000,'initial-catalog',1791334800000),
 ('hsk4-year',699000,'initial-catalog',1791334800000);
