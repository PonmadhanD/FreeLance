import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JobsService } from '../services/jobs.service';
import type { Job } from '../services/jobs.service';
import { ProposalsService } from '../services/proposals.service';

export default function JobDetails() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [coverLetter, setCoverLetter] = useState('');
    const [proposedAmount, setProposedAmount] = useState<number>(0);

    // Auth simulation
    const freelancerId = "0xDemoFreelancer"; // In real app, await AuthService.getUser()

    useEffect(() => {
        if (jobId) {
            loadJob(jobId);
        }
    }, [jobId]);

    const loadJob = async (id: string) => {
        setLoading(true);
        try {
            const fetchedJob = await JobsService.getJobById(id);
            setJob(fetchedJob);
            if (fetchedJob) {
                setProposedAmount(fetchedJob.budget);
            }
        } catch (error) {
            console.error("Failed to load job", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (!coverLetter.trim()) {
            alert('Please write a cover letter');
            return;
        }

        if (!job || !job.id) return;

        setApplying(true);
        try {
            await ProposalsService.submitProposal({
                jobId: job.id,
                freelancerId: freelancerId,
                coverLetter: coverLetter,
                proposedAmount: proposedAmount,
                estimatedDuration: 7 // hardcoded for MVP
            });
            alert('Application submitted successfully!');
            setCoverLetter('');
            navigate('/'); // Redirect to home or my proposals
        } catch (error: any) {
            console.error("Failed to submit proposal", error);
            alert("Failed to submit: " + error.message);
        } finally {
            setApplying(false);
        }
    };

    if (loading) return <div className="loading-screen">Loading Job Details...</div>;
    if (!job) return <div className="error-screen">Job not found</div>;

    return (
        <div className="job-details-container">
            <div className="job-header">
                <h1>{job.title}</h1>
                <div className="job-meta">
                    <span className="budget">${Number(job.budget).toLocaleString()}</span>
                    <span className={`status-badge status-${job.status}`}>{job.status}</span>
                </div>
            </div>

            <div className="content-grid">
                <div className="main-content">
                    <section className="job-description">
                        <h2>Description</h2>
                        <p>{job.description}</p>
                    </section>

                    <section className="milestones-preview">
                        <h2>Milestones (Plan)</h2>
                        {/* If we had milestones in Job model, map them. For now, static placeholder or fetch */}
                        <div className="milestone-list">
                            <p>Milestones will be finalized during project creation.</p>
                        </div>
                    </section>

                    <section className="apply-section">
                        <h2>Apply for this Job</h2>
                        <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Write why you're the best fit for this project..."
                            rows={6}
                            className="cover-letter-input"
                        />
                        <div className="input-group">
                            <label>Propose Budget</label>
                            <input
                                type="number"
                                value={proposedAmount}
                                onChange={(e) => setProposedAmount(Number(e.target.value))}
                            />
                        </div>

                        <button
                            onClick={handleApply}
                            disabled={applying}
                            className="apply-btn"
                        >
                            {applying ? 'Submitting...' : 'Submit Proposal'}
                        </button>
                    </section>
                </div>

                <aside className="sidebar">
                    <div className="client-info">
                        <h3>Client</h3>
                        <p className="wallet-address">
                            {job.client?.displayName || job.client?.walletAddress || "Unknown Client"}
                        </p>
                    </div>

                    <div className="escrow-status">
                        <h3>Escrow Status</h3>
                        <div className="status-indicator status-draft">
                            <span className="indicator-dot"></span>
                            <span>Awaiting Funding</span>
                        </div>
                        <p className="helper-text">Funds will be secured once client hires a freelancer</p>
                    </div>
                </aside>
            </div>

            <style>{`
                .input-group {
                    margin: 1rem 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .input-group input {
                    padding: 0.8rem;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(0,0,0,0.2);
                    color: white;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
}
