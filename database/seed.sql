-- ============================================================
-- ChainLance Sample Seed Data - PostgreSQL
-- ============================================================
-- Description: Sample data for development and testing
-- ============================================================

-- Insert sample users
INSERT INTO users (id, wallet_address, email, display_name, role, bio, skills) VALUES
    ('11111111-1111-1111-1111-111111111111', '0x1234567890123456789012345678901234567890', 'alice@example.com', 'Alice Johnson', 'client', 'Startup founder looking for quality developers', '[]'),
    ('22222222-2222-2222-2222-222222222222', '0x2345678901234567890123456789012345678901', 'bob@example.com', 'Bob Smith', 'freelancer', 'Full-stack developer with 5 years experience', '["React", "Node.js", "Solidity", "PostgreSQL"]'),
    ('33333333-3333-3333-3333-333333333333', '0x3456789012345678901234567890123456789012', 'carol@example.com', 'Carol Lee', 'both', 'Designer and occasional client', '["UI/UX", "Figma", "React"]'),
    ('44444444-4444-4444-4444-444444444444', '0x4567890123456789012345678901234567890123', NULL, 'Dev Master', 'freelancer', 'Smart contract specialist', '["Solidity", "Web3", "Hardhat"]');

-- Insert sample jobs
INSERT INTO jobs (id, client_id, title, description, budget, status, required_skills, deadline) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Build React Dashboard', 'Need a modern admin dashboard with charts and analytics', 2.5, 'open', '["React", "TypeScript", "TailwindCSS"]', NOW() + INTERVAL '30 days'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Smart Contract Audit', 'Security audit for ERC20 token contract', 5.0, 'in_progress', '["Solidity", "Security"]', NOW() + INTERVAL '14 days'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'Landing Page Design', 'Modern landing page for SaaS product', 1.2, 'open', '["Figma", "UI/UX"]', NOW() + INTERVAL '10 days');

-- Insert sample proposals
INSERT INTO proposals (id, job_id, freelancer_id, cover_letter, proposed_amount, estimated_duration, status) VALUES
    ('pppppppp-1111-1111-1111-pppppppppppp', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'I have built 10+ React dashboards with similar requirements. I can deliver in 3 weeks.', 2.3, 21, 'pending'),
    ('pppppppp-2222-2222-2222-pppppppppppp', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'Certified smart contract auditor with 50+ audits completed.', 4.8, 10, 'accepted'),
    ('pppppppp-3333-3333-3333-pppppppppppp', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'I can help with the UI/UX design and React implementation.', 2.4, 25, 'pending');

-- Insert sample project (for accepted proposal)
INSERT INTO projects (id, job_id, proposal_id, client_id, freelancer_id, total_amount, status) VALUES
    ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'pppppppp-2222-2222-2222-pppppppppppp', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 4.8, 'active');

-- Insert sample milestones
INSERT INTO milestones (id, project_id, title, description, amount, escrow_contract_address, status, due_date) VALUES
    ('mmmmmmmm-1111-1111-1111-mmmmmmmmmmmm', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Initial Security Review', 'Review contract code and identify potential vulnerabilities', 1.6, '0xabcdef1234567890abcdef1234567890abcdef12', 'funded', NOW() + INTERVAL '5 days'),
    ('mmmmmmmm-2222-2222-2222-mmmmmmmmmmmm', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Detailed Audit Report', 'Comprehensive audit report with recommendations', 2.0, NULL, 'pending', NOW() + INTERVAL '10 days'),
    ('mmmmmmmm-3333-3333-3333-mmmmmmmmmmmm', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'Final Verification', 'Verify fixes and provide final clearance', 1.2, NULL, 'pending', NOW() + INTERVAL '14 days');

-- Insert sample escrow transaction
INSERT INTO escrow_transactions (milestone_id, transaction_hash, event_type, from_address, amount, block_number, timestamp) VALUES
    ('mmmmmmmm-1111-1111-1111-mmmmmmmmmmmm', '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'funded', '0x1234567890123456789012345678901234567890', 1.6, 12345678, NOW() - INTERVAL '2 days');

-- Insert sample messages
INSERT INTO messages (project_id, sender_id, content, read_at) VALUES
    ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '11111111-1111-1111-1111-111111111111', 'Hi! Looking forward to working with you on this audit.', NOW() - INTERVAL '1 day'),
    ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '44444444-4444-4444-4444-444444444444', 'Thanks! I have started the initial review. Will update you by EOD.', NOW() - INTERVAL '1 day'),
    ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '44444444-4444-4444-4444-444444444444', 'Found a few potential issues. Can we schedule a call to discuss?', NOW() - INTERVAL '6 hours');
