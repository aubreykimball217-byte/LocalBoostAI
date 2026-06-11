-- Audit Requests table
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(255) NOT NULL,
    business_url TEXT,
    email VARCHAR(255) NOT NULL,
    score INTEGER,
    report_url TEXT,
    results JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email);
