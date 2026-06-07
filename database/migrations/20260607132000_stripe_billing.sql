-- Ensure subscriptions table has unique business_id
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_business_id_key;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_business_id_key UNIQUE (business_id);

-- Ensure other tables have necessary columns if any (optional based on logic)
