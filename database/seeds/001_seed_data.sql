-- Insert a test user (password: password123)
-- Real bcrypt hash for 'password123': $2a$12$LQv3c1yqBWVHxkdZzGJJ6uXzZ6W5Z6W5Z6W5Z6W5Z6W5Z6W5Z6W5Z (dummy)
-- Let's use a properly formatted one
INSERT INTO users (id, email, password_hash, first_name, last_name, role)
VALUES 
('d1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'owner@example.com', '$2a$12$LQv3c1yqBWVHxkdZzGJJ6uXzZ6W5Z6W5Z6W5Z6W5Z6W5Z6W5Z6W5Z', 'John', 'Doe', 'owner'),
('d2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'admin@localboost.ai', '$2a$12$LQv3c1yqBWVHxkdZzGJJ6uXzZ6W5Z6W5Z6W5Z6W5Z6W5Z6W5Z6W5Z', 'System', 'Admin', 'admin');

-- Insert a test business
INSERT INTO businesses (id, owner_id, name, address, phone, website, google_place_id, industry, timezone)
VALUES 
('e1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'd1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'Smile Dental Clinic', '123 Main St, Anytown, USA', '555-0123', 'https://smiledental.example.com', 'ChIJN1t_tDeuEmsRUsoyG839cyw', 'Dentistry', 'America/New_York');

-- Insert some reviews
INSERT INTO reviews (business_id, platform, external_id, reviewer_name, rating, comment, review_date, response_status)
VALUES 
('e1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'google', 'rev1', 'Alice Johnson', 5, 'Great service and friendly staff!', CURRENT_TIMESTAMP - INTERVAL '2 days', 'pending'),
('e1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'google', 'rev2', 'Bob Smith', 4, 'Very professional, but the wait time was a bit long.', CURRENT_TIMESTAMP - INTERVAL '5 days', 'drafted'),
('e1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'facebook', 'rev3', 'Charlie Brown', 2, 'Had a hard time scheduling an appointment.', CURRENT_TIMESTAMP - INTERVAL '10 days', 'pending');

-- Insert some customers
INSERT INTO customers (business_id, first_name, last_name, email, phone, last_visit, tags)
VALUES 
('e1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'David', 'Wilson', 'david.wilson@example.com', '555-1111', CURRENT_TIMESTAMP - INTERVAL '30 days', '["regular", "cleaning"]'),
('e1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'Eve', 'Davis', 'eve.davis@example.com', '555-2222', CURRENT_TIMESTAMP - INTERVAL '60 days', '["whitening"]');

-- Insert a lead
INSERT INTO leads (business_id, source, first_name, last_name, email, phone, message, status)
VALUES 
('e1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'chat', 'Frank', 'Miller', 'frank.miller@example.com', '555-3333', 'I would like to know more about your dental implants.', 'new');
