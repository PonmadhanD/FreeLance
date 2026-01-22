import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MilestoneSpire } from '../components/MilestoneSpire';
import { EscrowBlockGrid } from '../components/EscrowBlockGrid';
import { TrustBadge } from '../components/TrustBadge';
import { ProjectsService } from '../services/projects.service';
import type { Project } from '../services/projects.service';
import { MilestonesService } from '../services/milestones.service';
import type { Milestone } from '../services/milestones.service';
import { AuthService } from '../services/auth.service';

export default function ProjectWorkspace() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
    const [holdProgress, setHoldProgress] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const init = async () => {
            const user = await AuthService.getUser();
            setCurrentUser(user);
            if (projectId) {
                await loadProjectData(projectId);
            }
        };
        init();
    }, [projectId]);

    const loadProjectData = async (id: string) => {
        setLoading(true);
        try {
            const fetchedProject = await ProjectsService.getProjectById(id);
            const fetchedMilestones = await MilestonesService.getProjectMilestones(id);

            setProject(fetchedProject);
            setMilestones(fetchedMilestones);

            // Determine active milestone index base on status
            const firstActive = fetchedMilestones.findIndex(m => m.status === 'funded' || m.status === 'submitted');
            setActiveMilestoneIndex(firstActive !== -1 ? firstActive : 0);

        } catch (error) {
            console.error("Failed to load project data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleHoldStart = () => {
        const interval = setInterval(() => {
            setHoldProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    handleReleaseConfirmed();
                    return 100;
                }
                return prev + 5;
            });
        }, 50);
        (window as any).holdInterval = interval;
    };

    const handleHoldEnd = () => {
        clearInterval((window as any).holdInterval);
        setHoldProgress(0);
    };

    const handleReleaseConfirmed = async () => {
        const activeMilestone = milestones[activeMilestoneIndex];
        if (!activeMilestone?.id) return;

        try {
            await MilestonesService.approveMilestone(activeMilestone.id);
            alert("Funds Released! Transaction Confirmed on-chain.");
            await loadProjectData(projectId!);
        } catch (e) {
            console.error(e);
            alert("Failed to release funds. Check your wallet connection.");
        } finally {
            setHoldProgress(0);
        }
    };

    const handleSubmitWork = async () => {
        const activeMilestone = milestones[activeMilestoneIndex];
        if (!activeMilestone?.id) return;

        setSubmitting(true);
        try {
            await MilestonesService.submitMilestone(activeMilestone.id);
            alert("Work submitted! The client has been notified to review and release funds.");
            await loadProjectData(projectId!);
        } catch (error) {
            console.error("Submission failed", error);
            alert("Failed to submit work.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRaiseDispute = async () => {
        const activeMilestone = milestones[activeMilestoneIndex];
        if (!activeMilestone?.id) return;

        const reason = window.prompt("Why are you raising a dispute?");
        if (!reason) return;

        try {
            await MilestonesService.raiseDispute(activeMilestone.id, reason);
            alert("Dispute raised. ChainLance administrators will review and resolve this.");
            await loadProjectData(projectId!);
        } catch (error) {
            console.error("Dispute failed", error);
            alert("Failed to raise dispute.");
        }
    };

    if (loading) return <div className="loading-screen">Loading Workspace...</div>;
    if (!project) return <div className="error-screen">Project not found</div>;

    const isClient = currentUser && project.clientId === currentUser.id;
    const isFreelancer = currentUser && project.freelancerId === currentUser.id;
    const activeMilestone = milestones[activeMilestoneIndex];

    const totalEscrowed = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const paidAmount = milestones
        .filter(m => m.status === 'paid')
        .reduce((sum, m) => sum + Number(m.amount), 0);

    return (
        <div className="workspace-container">
            <div className="visual-header glass-panel">
                <div className="header-left">
                    <button onClick={() => navigate('/my-projects')} className="btn-ghost btn-small">← Back</button>
                    <h1>Project #{project.id?.slice(0, 8)}</h1>
                    <TrustBadge state={project.status === 'disputed' ? 'disputed' : 'secure'} />
                </div>
                <div className="trust-meter">
                    <span className="meter-label">Verified Escrow Progression</span>
                    <EscrowBlockGrid totalAmount={totalEscrowed} releasedAmount={paidAmount} />
                </div>
            </div>

            <div className="workspace-grid">
                <div className="spire-section">
                    <h3>Progression Spire</h3>
                    <MilestoneSpire milestones={milestones as any[]} activeIndex={activeMilestoneIndex} />
                </div>

                <div className="action-context glass-panel">
                    {project.status === 'disputed' || activeMilestone?.status === 'disputed' ? (
                        <div className="dispute-lockdown">
                            <span className="lock-icon">🔒</span>
                            <h2>Administrative Lockdown</h2>
                            <p>This project is currently under review by our dispute resolution team.</p>
                            <button className="btn-ghost" disabled>Check Dispute Status</button>
                        </div>
                    ) : (
                        <div className="active-task-view">
                            <span className="task-label">Current Milestone</span>
                            <h3>{activeMilestone?.title || 'No active milestone'}</h3>
                            <p className="milestone-amount">Value: ${Number(activeMilestone?.amount).toLocaleString()}</p>

                            <div className="workflow-actions">
                                {isFreelancer && activeMilestone?.status === 'funded' && (
                                    <div className="freelancer-actions">
                                        <p>You've been funded. Complete the work and submit for approval.</p>
                                        <button
                                            onClick={handleSubmitWork}
                                            disabled={submitting}
                                            className="btn-primary btn-large"
                                        >
                                            {submitting ? 'Submitting...' : 'Submit Work for Review'}
                                        </button>
                                    </div>
                                )}

                                {isClient && activeMilestone?.status === 'submitted' && (
                                    <div className="client-actions">
                                        <p>Freelancer has submitted work. Review it carefully before releasing funds.</p>
                                        <button
                                            className="release-btn-large"
                                            onMouseDown={handleHoldStart}
                                            onMouseUp={handleHoldEnd}
                                            onMouseLeave={handleHoldEnd}
                                            style={{
                                                background: `linear-gradient(90deg, var(--color-liquid) ${holdProgress}%, rgba(255,255,255,0.1) ${holdProgress}%)`
                                            }}
                                        >
                                            {holdProgress > 0 ? 'Hold to Confirm Release...' : 'Release Milestone Funds'}
                                        </button>
                                        <p className="micro-copy">Hold to trigger smart contract payment</p>
                                    </div>
                                )}

                                {activeMilestone?.status === 'funded' && isClient && <p>Awaiting freelancer submission...</p>}
                                {activeMilestone?.status === 'submitted' && isFreelancer && <p>Awaiting client approval...</p>}
                                {activeMilestone?.status === 'paid' && <p>This milestone has been paid. Waiting for next phase.</p>}
                            </div>

                            <div className="secondary-actions">
                                <button onClick={handleRaiseDispute} className="btn-dispute">Raise Dispute</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .workspace-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
                .visual-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1.5rem; }
                .header-left h1 { margin: 0.5rem 0; font-size: 1.8rem; }
                .trust-meter { width: 400px; }
                .workspace-grid { display: grid; grid-template-columns: 350px 1fr; gap: 2rem; }
                .action-context { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 450px; background: radial-gradient(circle at center, rgba(74, 158, 255, 0.05) 0%, rgba(0,0,0,0) 70%); }
                .milestone-amount { font-size: 1.4rem; font-weight: bold; color: var(--color-liquid); margin: 1rem 0; }
                .workflow-actions { margin: 2rem 0; min-height: 150px; display: flex; flex-direction: column; justify-content: center; }
                .release-btn-large { margin-top: 1rem; padding: 1.5rem 2.5rem; font-size: 1.1rem; font-weight: bold; color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 50px; cursor: pointer; min-width: 300px; }
                .btn-dispute { margin-top: 2rem; background: transparent; color: #ff4444; border: 1px solid rgba(255, 68, 68, 0.3); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
                .btn-dispute:hover { background: rgba(255, 68, 68, 0.1); }
                .dispute-lockdown { padding: 2rem; border: 1px dashed #ff4444; border-radius: 12px; }
                .lock-icon { font-size: 3rem; display: block; margin-bottom: 1rem; }
                .micro-copy { margin-top: 0.8rem; font-size: 0.8rem; color: #888; }
            `}</style>
        </div>
    );
}
