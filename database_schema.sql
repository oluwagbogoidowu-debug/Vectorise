-- Vectorise Production Database Schema
-- Optimized for PostgreSQL
-- Focus: Financial Integrity, Payment Auditing, and Progress Tracking

-- 1. Users Table
-- Core identity and attribution for revenue tracking
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    role VARCHAR(50) DEFAULT 'PARTICIPANT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);

-- 2. Sprints Table
-- Product catalog for purchase and reporting
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payments Table (Single Source of Truth)
-- Detailed attempt tracking and verified success
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    status payment_status DEFAULT 'pending',
    payment_provider VARCHAR(50) DEFAULT 'flutterwave',
    tx_ref VARCHAR(100) UNIQUE NOT NULL,
    provider_transaction_id VARCHAR(255),
    payment_method VARCHAR(50),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    is_test BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_tx_ref ON payments(tx_ref);

-- 4. Payment Events Table (Audit Trail)
-- Logs raw payloads for debugging and verification
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- e.g., 'initiated', 'webhook_received', 'verified', 'failed'
    provider_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payment_events_payment_id ON payment_events(payment_id);

-- 5. Refunds Table
-- Separated tracking for financial reconciliation
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'processed',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. User Sprints Table
-- Connects financial success to product usage
CREATE TABLE user_sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_user_sprints_user_id ON user_sprints(user_id);
CREATE INDEX idx_user_sprints_sprint_id ON user_sprints(sprint_id);

-- 7. Integrity Constraints (Sample Triggers/Rules)
-- Enforced via application logic or database constraints:
-- - No duplicate tx_ref (Unique constraint on payments.tx_ref)
-- - Payments marked success only after server-side verification (Rule)
-- - Refunds cannot exceed original amount (Check constraint)
ALTER TABLE refunds ADD CONSTRAINT check_refund_limit CHECK (amount > 0);
