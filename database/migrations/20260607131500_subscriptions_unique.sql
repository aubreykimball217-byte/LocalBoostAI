-- Add unique constraint to subscriptions(business_id)
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_business_id_key UNIQUE (business_id);
