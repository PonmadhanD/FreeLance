import { useState, useEffect } from 'react';
import type { Milestone } from '../services/milestones.service';
import { MilestonesService } from '../services/milestones.service';
import { API_BASE_URL } from '../config/api';

type ResolutionAction = 'pay_freelancer' | 'refund_client' | null;

export default function AdminPanel() {
    const [disputes, setDisputes] = useState<Milestone[]>([]);
    const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
    const [resolutionAction, setResolutionAction] = useState<ResolutionAction>(null);
    const [resolving, setResolving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDisputes();
    }, []);

    const loadDisputes = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/disputes`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('cl_token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDisputes(data);
            } else {
                console.error("Failed to fetch disputes");
            }
        } catch (error) {
            console.error("Error loading disputes", error);
        } finally {
            setLoading(false);
        }
    };

    const selectedDispute = disputes.find(d => d.id === selectedDisputeId);

    const handleResolve = async () => {
        if (!resolutionAction || !selectedDisputeId) {
            alert('Please select a resolution action');
            return;
        }

        setResolving(true);
        try {
            if (resolutionAction === 'pay_freelancer') {
                await MilestonesService.approveMilestone(selectedDisputeId);
            } else {
                await MilestonesService.refundMilestone(selectedDisputeId);
            }
            alert(`Resolution executed: ${resolutionAction.replace('_', ' ').toUpperCase()}`);
            setSelectedDisputeId(null);
            setResolutionAction(null);
            await loadDisputes();
        } catch (error: any) {
            console.error("Resolution failed", error);
            alert("Resolution failed: " + error.message);
        } finally {
            setResolving(false);
        }
    };

    if (loading) return <div className="admin-container"><p>Loading Disputes...</p></div>;

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Admin Panel</h1>
                <div className="admin-badge">Resolution Center</div>
            </header>

            <div className="admin-content">
                <section className="disputes-list-section">
                    <h2>Active Disputes ({disputes.length})</h2>

                    {disputes.length === 0 ? (
                        <div className="empty-state">
                            <p>No active disputes found.</p>
                        </div>
                    ) : (
                        <div className="disputes-list">
                            {disputes.map(d => (
                                <div
                                    key={d.id}
                                    className={`dispute-card ${selectedDisputeId === d.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedDisputeId(d.id)}
                                >
                                    <div className="dispute-header">
                                        <h3>Milestone: {d.title}</h3>
                                        <span className="dispute-badge">DISPUTED</span>
                                    </div>
                                    <div className="dispute-meta">
                                        <span>Value: ${Number(d.amount).toLocaleString()}</span>
                                        <span>•</span>
                                        <span>Project #{d.projectId.slice(0, 8)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {selectedDispute && (
                    <section className="resolution-panel glass-panel">
                        <h2>Resolution Details</h2>

                        <div className="evidence-section">
                            <h3>Dispute Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Title:</span>
                                    <span className="info-value">{selectedDispute.title}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Value:</span>
                                    <span className="info-value">${Number(selectedDispute.amount).toLocaleString()}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Raised At:</span>
                                    <span className="info-value">{new Date(selectedDispute.updatedAt).toLocaleString()}</span>
                                </div>
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
                                                Force release of escrowed funds to freelancer.
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
                                                Return locked funds back to the client.
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
                    </div>
                </div>
            )}
        </div>
    );
}
