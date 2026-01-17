-- ============================================================
-- ChainLance Database Schema - PostgreSQL
-- ============================================================
-- Version: 1.0
-- Description: Complete schema for freelance marketplace with blockchain escrow
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('client', 'freelancer', 'both');

CREATE TYPE job_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

CREATE TYPE project_status AS ENUM ('active', 'completed', 'disputed', 'cancelled');

CREATE TYPE milestone_status AS ENUM (
    'pending',
    'funded',
    'submitted',
    'approved',
    'paid',
    'disputed',
    'refunded'
);

CREATE TYPE dispute_status AS ENUM (
    'open',
    'under_review',
    'resolved_client',
    'resolved_freelancer',
    'resolved_split'
);

CREATE TYPE escrow_event_type AS ENUM ('created', 'funded', 'released', 'refunded');

-- ============================================================
-- TABLE: users
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    bio TEXT,
    skills JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT wallet_address_format CHECK (wallet_address ~* '^0x[a-f0-9]{40}$')
);

-- ============================================================
-- TABLE: jobs
-- ============================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(18,6) NOT NULL,
    status job_status NOT NULL DEFAULT 'open',
    required_skills JSONB DEFAULT '[]',
    deadline TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_budget CHECK (budget > 0)
);

-- ============================================================
-- TABLE: proposals
-- ============================================================

CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    cover_letter TEXT NOT NULL,
    proposed_amount DECIMAL(18,6) NOT NULL,
    estimated_duration INTEGER,
    status proposal_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_proposed_amount CHECK (proposed_amount > 0),
    CONSTRAINT positive_duration CHECK (estimated_duration IS NULL OR estimated_duration > 0),
    CONSTRAINT one_proposal_per_freelancer_per_job UNIQUE (job_id, freelancer_id)
);

-- ============================================================
-- TABLE: projects
-- ============================================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    proposal_id UUID UNIQUE NOT NULL REFERENCES proposals(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_amount DECIMAL(18,6) NOT NULL,
    status project_status NOT NULL DEFAULT 'active',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_total_amount CHECK (total_amount > 0),
    CONSTRAINT different_parties CHECK (client_id != freelancer_id)
);

-- ============================================================
-- TABLE: milestones
-- ============================================================

CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(18,6) NOT NULL,
    escrow_contract_address VARCHAR(42) UNIQUE,
    status milestone_status NOT NULL DEFAULT 'pending',
    due_date TIMESTAMP,
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_milestone_amount CHECK (amount > 0),
    CONSTRAINT escrow_address_format CHECK (
        escrow_contract_address IS NULL OR 
        escrow_contract_address ~* '^0x[a-f0-9]{40}$'
    )
);

-- ============================================================
-- TABLE: escrow_transactions
-- ============================================================

CREATE TABLE escrow_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE RESTRICT,
    transaction_hash VARCHAR(66) UNIQUE NOT NULL,
    event_type escrow_event_type NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    amount DECIMAL(18,6) NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT tx_hash_format CHECK (transaction_hash ~* '^0x[a-f0-9]{64}$'),
    CONSTRAINT positive_tx_amount CHECK (amount > 0),
    CONSTRAINT positive_block_number CHECK (block_number > 0)
);

-- ============================================================
-- TABLE: disputes
-- ============================================================

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE RESTRICT,
    raised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    status dispute_status NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: messages
-- ============================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT non_empty_content CHECK (LENGTH(TRIM(content)) > 0)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Users
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_role ON users(role);

-- Jobs
CREATE INDEX idx_jobs_client_status ON jobs(client_id, status);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Proposals
CREATE INDEX idx_proposals_job_status ON proposals(job_id, status);
CREATE INDEX idx_proposals_freelancer_status ON proposals(freelancer_id, status);

-- Projects
CREATE INDEX idx_projects_client_status ON projects(client_id, status);
CREATE INDEX idx_projects_freelancer_status ON projects(freelancer_id, status);
CREATE INDEX idx_projects_started_at ON projects(started_at DESC);

-- Milestones
CREATE INDEX idx_milestones_project_status ON milestones(project_id, status);
CREATE INDEX idx_milestones_escrow_address ON milestones(escrow_contract_address) WHERE escrow_contract_address IS NOT NULL;

-- Escrow Transactions
CREATE INDEX idx_escrow_transactions_milestone ON escrow_transactions(milestone_id, timestamp DESC);
CREATE INDEX idx_escrow_transactions_block ON escrow_transactions(block_number);

-- Disputes
CREATE INDEX idx_disputes_milestone ON disputes(milestone_id);
CREATE INDEX idx_disputes_status_created ON disputes(status, created_at DESC);

-- Messages
CREATE INDEX idx_messages_project_created ON messages(project_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE users IS 'User profiles for clients and freelancers';
COMMENT ON TABLE jobs IS 'Job postings created by clients';
COMMENT ON TABLE proposals IS 'Freelancer applications to jobs';
COMMENT ON TABLE projects IS 'Active work contracts';
COMMENT ON TABLE milestones IS 'Payable work units with escrow linkage';
COMMENT ON TABLE escrow_transactions IS 'Immutable blockchain event log';
COMMENT ON TABLE disputes IS 'Conflict resolution system';
COMMENT ON TABLE messages IS 'Project-scoped communication';

COMMENT ON COLUMN milestones.escrow_contract_address IS 'On-chain escrow contract address for this milestone';
COMMENT ON COLUMN escrow_transactions.transaction_hash IS 'Blockchain transaction hash';
COMMENT ON COLUMN escrow_transactions.block_number IS 'Block number where transaction was mined';
