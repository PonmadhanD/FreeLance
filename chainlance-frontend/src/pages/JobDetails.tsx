import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { JobsService } from '../services/jobs.service';
import type { Job } from '../services/jobs.service';
import { ProposalsService } from '../services/proposals.service';
import type { Proposal } from '../services/proposals.service';
import { AuthService } from '../services/auth.service';
import { Web3Service } from '../services/web3.service';

export default function JobDetails() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState<Job | null>(null);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const [hiring, setHiring] = useState<string | null>(null);
    const [coverLetter, setCoverLetter] = useState('');
    const [proposedAmount, setProposedAmount] = useState<number>(0);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            const user = await AuthService.getUser();
            setCurrentUser(user);
            if (jobId) {
                await loadJob(jobId, user);
            }
        };
        init();
    }, [jobId]);

    const loadJob = async (id: string, user: any) => {
        setLoading(true);
        try {
            const fetchedJob = await JobsService.getJobById(id);
            setJob(fetchedJob);
            if (fetchedJob) {
                setProposedAmount(Number(fetchedJob.budget));

                // If client, load proposals
                if (user && fetchedJob.clientId === user.id) {
                    const props = await ProposalsService.getJobProposals(id);
                    setProposals(props);
                }
            }
        } catch (error) {
            console.error("Failed to load job", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (!coverLetter.trim() || coverLetter.length < 50) {
            alert('Please write a detailed cover letter (min 50 chars)');
            return;
        }

        if (!job || !job.id) return;

        setApplying(true);
        try {
            await ProposalsService.submitProposal(job.id, {
                coverLetter: coverLetter,
                proposedAmount: proposedAmount,
                estimatedDuration: 7
            });
            alert('Application submitted successfully!');
            setCoverLetter('');
            navigate('/account'); // Redirect to my projects/proposals
        } catch (error: any) {
            console.error("Failed to submit proposal", error);
            alert("Failed to submit: " + error.message);
        } finally {
            setApplying(false);
        }
    };

    const handleHire = async (proposal: Proposal) => {
        if (!window.confirm(`Hire ${proposal.freelancer?.displayName || 'this freelancer'} for $${proposal.proposedAmount}? This will trigger escrow funding.`)) {
            return;
        }

        setHiring(proposal.id);
        try {
            // 1. Web3 Funding (Case 3)
            // Note: In a real app, we'd need to create the project/milestone first to get an ID for the contract
            // But our backend's acceptProposal creates it.
            // So we might need a two-step:
            // 1. Call backend to 'prepare' hiring -> gets a milestone ID
            // 2. Fund on-chain
            // 3. Confirm to backend

            // For MVP, we'll follow the backend controller logic which creates the project in a transaction.
            // This means we should probably fund first with deterministic parameters or update backend after.

            const txHash = await Web3Service.fundMilestone(
                proposal.id, // Using proposal ID as temporary ref if needed
                proposal.proposedAmount.toString(),
                proposal.freelancer?.walletAddress || ''
            );
            console.log("Escrow funded, tx:", txHash);

            // 2. Accept Proposal on Backend (Creates Project & Milestone)
            await ProposalsService.acceptProposal(proposal.id);

            alert('Hired successfully! Funds are now in escrow.');
            navigate('/my-projects');
        } catch (error: any) {
            console.error("Hiring failed", error);
            alert("Hiring failed: " + error.message);
        } finally {
            setHiring(null);
        }
    };

    if (loading) return <div className="loading-screen">Loading Job Details...</div>;
    if (!job) return <div className="error-screen">Job not found</div>;

    const isOwner = currentUser && job.clientId === currentUser.id;
    const isFreelancer = currentUser && currentUser.role !== 'client';
    const skills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];

    return (
        <div className="job-details-container">
            <div className="job-header">
                <div className="title-area">
                    <h1>{job.title}</h1>
                    <Link to={`/profile/${job.client?.walletAddress}`} className="client-link">
                        By {job.client?.displayName || 'Anonymous Client'}
                    </Link>
                </div>
                <div className="job-meta">
                    <span className="budget">${Number(job.budget).toLocaleString()}</span>
                    <span className={`status-badge status-${job.status}`}>{job.status.replace('_', ' ')}</span>
                </div>
            </div>

            <div className="content-grid">
                <div className="main-content">
                    <section className="job-description glass-panel">
                        <h2>Description</h2>
                        <div className="description-text">{job.description}</div>
                        <div className="skills-required">
                            {skills.map((skill: string) => (
                                <span key={skill} className="skill-tag">{skill}</span>
                            ))}
                        </div>
                    </section>

                    {isOwner ? (
                        <section className="proposals-list-section">
                            <h2>Proposals ({proposals.length})</h2>
                            {proposals.length === 0 ? (
                                <div className="empty-state">No proposals yet.</div>
                            ) : (
                                <div className="proposals-grid">
                                    {proposals.map(p => (
                                        <div key={p.id} className="proposal-card glass-panel">
                                            <div className="proposal-header">
                                                <Link to={`/profile/${p.freelancer?.walletAddress}`} className="freelancer-link">
                                                    {p.freelancer?.displayName || 'Freelancer'}
                                                </Link>
                                                <span className="proposed-price">${Number(p.proposedAmount).toLocaleString()}</span>
                                            </div>
                                            <p className="cover-letter-preview">{p.coverLetter}</p>
                                            <div className="proposal-footer">
                                                <span className="date">{new Date(p.createdAt).toLocaleDateString()}</span>
                                                <button
                                                    onClick={() => handleHire(p)}
                                                    disabled={!!hiring || job.status !== 'open'}
                                                    className="btn-primary btn-small"
                                                >
                                                    {hiring === p.id ? 'Hiring...' : 'Hire & Fund'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    ) : isFreelancer && job.status === 'open' ? (
                        <section className="apply-section glass-panel">
                            <h2>Submit Proposal</h2>
                            <div className="form-group">
                                <label>Cover Letter (Explain your approach)</label>
                                <textarea
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    placeholder="Write why you're the best fit for this project..."
                                    rows={6}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Proposed Amount ($)</label>
                                    <input
                                        type="number"
                                        value={proposedAmount}
                                        onChange={(e) => setProposedAmount(Number(e.target.value))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Estimated Days</label>
                                    <input type="number" defaultValue={7} />
                                </div>
                            </div>

                            <button
                                onClick={handleApply}
                                disabled={applying}
                                className="btn-primary full-width"
                            >
                                {applying ? 'Submitting...' : 'Submit Proposal'}
                            </button>
                        </section>
                    ) : (
                        <div className="info-box">
                            {job.status !== 'open' ? 'This job is no longer accepting proposals.' : 'Please connect your wallet to apply.'}
                        </div>
                    )}
                </div>

                <aside className="sidebar">
                    <div className="client-stats glass-panel">
                        <h3>About the Client</h3>
                        <div className="stat-row">
                            <span>Verification</span>
                            <span className="verified-text">Identity Verified</span>
                        </div>
                        <div className="stat-row">
                            <span>Payment Status</span>
                            <span className="verified-text">Wallet Linked</span>
                        </div>
                    </div>

                    <div className="escrow-transparency glass-panel">
                        <h3>Secure Escrow</h3>
                        <div className="transparency-icon">🛡️</div>
                        <p>Funds are locked in a smart contract and only released when you approve the milestones.</p>
                        <div className="contract-preview">
                            <span className="dot pulse"></span>
                            <span>Awaiting deployment</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
