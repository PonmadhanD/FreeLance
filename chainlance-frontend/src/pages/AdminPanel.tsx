import { useState } from 'react';

type ResolutionAction = 'pay_freelancer' | 'refund_client' | null;

interface DisputedJob {
    id: string;
    title: string;
    client: string;
    freelancer: string;
    escrowAmount: number;
    disputeReason: string;
    milestoneInDispute: string;
    evidenceLinks: string[];
    raisedAt: string;
}

export default function AdminPanel() {
    const [selectedJob, setSelectedJob] = useState<string | null>(null);
    const [resolutionAction, setResolutionAction] = useState<ResolutionAction>(null);
    const [resolving, setResolving] = useState(false);

    const disputedJobs: DisputedJob[] = [
        {
            id: '1',
            title: 'Website Redesign Project',
            client: '0x742d...3e4f',
            freelancer: '0xabc1...def2',
            escrowAmount: 3000,
            disputeReason: 'Client claims deliverables do not match requirements',
            milestoneInDispute: 'Frontend Development',
            evidenceLinks: ['https://example.com/evidence1', 'https://example.com/evidence2'],
            raisedAt: '2026-01-16T10:30:00'
        },
        {
            id: '2',
            title: 'Mobile App Development',
            client: '0x891a...7b2c',
            freelancer: '0xdef3...ghi4',
            escrowAmount: 8000,
            disputeReason: 'Freelancer claims scope creep without additional payment',
            milestoneInDispute: 'Backend Integration',
            evidenceLinks: ['https://example.com/chat-logs'],
            raisedAt: '2026-01-14T15:45:00'
        }
    ];

    const selectedJobData = disputedJobs.find(j => j.id === selectedJob);

    const handleResolve = async () => {
        if (!resolutionAction) {
            alert('Please select a resolution action');
            return;
        }

        setResolving(true);
        // Simulate blockchain transaction
        setTimeout(() => {
            setResolving(false);
            alert(`Resolution executed: ${resolutionAction.replace('_', ' ').toUpperCase()}`);
            setSelectedJob(null);
            setResolutionAction(null);
        }, 2000);
    };

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Admin Panel</h1>
                <div className="admin-badge">Resolution Center</div>
            </header>

            <div className="admin-content">
                <section className="disputes-list-section">
                    <h2>Disputed Jobs ({disputedJobs.length})</h2>

                    {disputedJobs.length === 0 ? (
                        <div className="empty-state">
                            <p>No active disputes</p>
                        </div>
                    ) : (
                        <div className="disputes-list">
                            {disputedJobs.map(job => (
                                <div
                                    key={job.id}
                                    className={`dispute-card ${selectedJob === job.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedJob(job.id)}
                                >
                                    <div className="dispute-header">
                                        <h3>{job.title}</h3>
                                        <span className="dispute-badge">DISPUTED</span>
                                    </div>
                                    <div className="dispute-meta">
                                        <span>Escrow: ${job.escrowAmount}</span>
                                        <span>•</span>
                                        <span>{new Date(job.raisedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="dispute-parties">
                                        <span>Client: {job.client}</span>
                                        <span>Freelancer: {job.freelancer}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {selectedJobData && (
                    <section className="resolution-panel">
                        <h2>Resolution Details</h2>

                        <div className="evidence-section">
                            <h3>Dispute Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Milestone:</span>
                                    <span className="info-value">{selectedJobData.milestoneInDispute}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Reason:</span>
                                    <span className="info-value">{selectedJobData.disputeReason}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Escrow Amount:</span>
                                    <span className="info-value">${selectedJobData.escrowAmount}</span>
                                </div>
                            </div>

                            <div className="evidence-links">
                                <h4>Evidence</h4>
                                {selectedJobData.evidenceLinks.map((link, index) => (
                                    <a
                                        key={index}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="evidence-link"
                                    >
                                        Evidence Link {index + 1} →
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div className="resolution-actions">
                            <h3>Resolution Action</h3>

                            <div className="action-options">
                                <label className="action-option">
                                    <input
                                        type="radio"
                                        name="resolution"
                                        value="pay_freelancer"
                                        checked={resolutionAction === 'pay_freelancer'}
                                        onChange={(e) => setResolutionAction(e.target.value as ResolutionAction)}
                                    />
                                    <div className="option-content">
                                        <span className="option-icon">✓</span>
                                        <div>
                                            <div className="option-title">Pay Freelancer</div>
                                            <div className="option-description">
                                                Release escrow funds to freelancer's address
                                            </div>
                                        </div>
                                    </div>
                                </label>

                                <label className="action-option">
                                    <input
                                        type="radio"
                                        name="resolution"
                                        value="refund_client"
                                        checked={resolutionAction === 'refund_client'}
                                        onChange={(e) => setResolutionAction(e.target.value as ResolutionAction)}
                                    />
                                    <div className="option-content">
                                        <span className="option-icon">↩️</span>
                                        <div>
                                            <div className="option-title">Refund Client</div>
                                            <div className="option-description">
                                                Return remaining escrow to client's address
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <button
                                onClick={handleResolve}
                                disabled={!resolutionAction || resolving}
                                className="resolve-btn"
                            >
                                {resolving ? 'Executing Resolution...' : 'Execute Resolution'}
                            </button>
                        </div>
                    </section>
                )}
            </div>

            {resolving && (
                <div className="transaction-modal">
                    <div className="modal-content">
                        <div className="spinner"></div>
                        <h3>Transaction Pending</h3>
                        <p>Executing admin resolution on blockchain...</p>
                        <a href="#" className="explorer-link">View on Block Explorer →</a>
                    </div>
                </div>
            )}
        </div>
    );
}
