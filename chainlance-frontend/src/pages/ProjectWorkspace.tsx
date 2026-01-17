import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MilestoneSpire } from '../components/MilestoneSpire';
import { EscrowBlockGrid } from '../components/EscrowBlockGrid';
import { TrustBadge } from '../components/TrustBadge';
import { ProjectsService } from '../services/projects.service';
import type { Project } from '../services/projects.service';
import { MilestonesService } from '../services/milestones.service';
import type { Milestone } from '../services/milestones.service';

type PaymentState = 'draft' | 'escrowed' | 'milestone_paid' | 'disputed' | 'released';

export default function ProjectWorkspace() {
    const { id } = useParams<{ id: string }>();
    // const projectId = id; // Removed unused alias
    const [project, setProject] = useState<Project | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    const [paymentState, setPaymentState] = useState<PaymentState>('escrowed');
    const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);
    const [holdProgress, setHoldProgress] = useState(0);

    useEffect(() => {
        if (id) {
            loadProjectData(id);
        }
    }, [id]);

    const loadProjectData = async (projectId: string) => {
        setLoading(true);
        try {
            const fetchedProject = await ProjectsService.getProjectById(projectId);
            const fetchedMilestones = await MilestonesService.getProjectMilestones(projectId);

            setProject(fetchedProject);
            setMilestones(fetchedMilestones);

            // Determine active milestone index based on status
            const firstPending = fetchedMilestones.findIndex(m => m.status === 'pending' || m.status === 'funded');
            setActiveMilestoneIndex(firstPending !== -1 ? firstPending : fetchedMilestones.length - 1);

            // Determine payment state based on project status
            if (fetchedProject?.status === 'disputed') setPaymentState('disputed');
            else if (fetchedProject?.status === 'completed') setPaymentState('released');
            else setPaymentState('escrowed');

        } catch (error) {
            console.error("Failed to load project data", error);
        } finally {
            setLoading(false);
        }
    };

    const totalEscrowed = milestones.reduce((sum, m) => sum + Number(m.amount), 0);
    const paidAmount = milestones
        .filter(m => m.status === 'paid')
        .reduce((sum, m) => sum + Number(m.amount), 0);

    // Friction Button Logic
    const handleHoldStart = () => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setHoldProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                handleActionConfirmed();
            }
        }, 50);
        // Store interval to clear on mouseup (omitted for brevity in demo)
        // In real impl, use ref for interval ID
        (window as any).holdInterval = interval;
    };

    const handleHoldEnd = () => {
        clearInterval((window as any).holdInterval);
        setHoldProgress(0);
    };

    const handleActionConfirmed = async () => {
        try {
            // Optimistic update
            setPaymentState('milestone_paid');
            setHoldProgress(0); // Reset immediately for UI feel

            const activeMilestone = milestones[activeMilestoneIndex];
            if (activeMilestone && activeMilestone.id) {
                // Call Service which handles Web3 -> Firestore Fallback
                await MilestonesService.releaseMilestone(activeMilestone.id);

                setActiveMilestoneIndex(prev => Math.min(prev + 1, milestones.length - 1));
            }

            alert("Funds Released! (Transaction Confirmed)");
        } catch (e) {
            console.error(e);
            alert("Failed to release funds");
            setPaymentState('escrowed'); // Revert on failure
        } finally {
            setHoldProgress(0);
        }
    };

    if (loading) return <div className="loading-screen">Loading Workspace...</div>;
    if (!project) return <div className="error-screen">Project not found</div>;

    // Use dummy data if milestones are empty (fresh project) for demo visualization
    const displayMilestones = milestones.length > 0 ? milestones : [
        { id: '1', title: 'Project Initialization', amount: 0, status: 'pending' as const }
    ];

    return (
        <div className="workspace-container">
            {/* Top Bar: Transparency Panel */}
            <div className="visual-header glass-panel">
                <div className="header-left">
                    <h1>Project #{id?.slice(0, 6)}</h1>
                    {/* project.title if we fetched job details joined to project */}
                    <TrustBadge state={paymentState === 'escrowed' ? 'secure' : 'disputed'} />
                </div>
                <div className="trust-meter">
                    <span className="meter-label">Verified Escrow Balance</span>
                    <EscrowBlockGrid totalAmount={totalEscrowed} releasedAmount={paidAmount} />
                </div>
            </div>

            <div className="workspace-grid">
                {/* Left: The Spire (Workflow) */}
                <div className="spire-section">
                    <h3>Progression Spire</h3>
                    {/* Casting to any to match compatible types if slightly mismatching between strict Firestore types and Component props */}
                    <MilestoneSpire milestones={displayMilestones as any[]} activeIndex={activeMilestoneIndex} />
                </div>

                {/* Right: The Context (Actions) */}
                <div className="action-context glass-panel">
                    <h2>Current Workflow Context</h2>

                    {paymentState === 'disputed' ? (
                        <div className="dispute-lockdown">
                            <h3>⚠️ Administrative Lockdown</h3>
                            <p>Funds are frozen pending resolution.</p>
                        </div>
                    ) : (
                        <div className="active-task-view">
                            <span className="task-label">Current Objective</span>
                            <h3>{displayMilestones[activeMilestoneIndex]?.title}</h3>

                            <div className="friction-actions">
                                <button
                                    className="release-btn-large"
                                    onMouseDown={handleHoldStart}
                                    onMouseUp={handleHoldEnd}
                                    onMouseLeave={handleHoldEnd}
                                    style={{
                                        background: `linear-gradient(90deg, var(--color-liquid) ${holdProgress}%, #333 ${holdProgress}%)`
                                    }}
                                >
                                    {holdProgress > 0 ? 'Hold to Release...' : 'Release Milestone Funds'}
                                </button>
                                <p className="micro-copy">
                                    Hold for 3 seconds to irreversibly release ${Number(displayMilestones[activeMilestoneIndex]?.amount)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .workspace-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .visual-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    background: rgba(0,0,0,0.4);
                }

                .header-left h1 {
                    margin-bottom: 0.5rem;
                    font-size: 1.8rem;
                }

                .trust-meter {
                    width: 400px;
                }

                .workspace-grid {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    gap: 2rem;
                }

                .action-context {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                    min-height: 400px;
                    background: radial-gradient(circle at center, rgba(74, 158, 255, 0.1) 0%, rgba(0,0,0,0) 70%);
                }

                .release-btn-large {
                    margin-top: 2rem;
                    padding: 1.5rem 3rem;
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 50px;
                    cursor: pointer;
                    overflow: hidden;
                    transition: transform 0.1s;
                }

                .release-btn-large:active {
                    transform: scale(0.98);
                }

                .micro-copy {
                    margin-top: 1rem;
                    font-size: 0.8rem;
                    color: #888;
                }
            `}</style>
        </div>
    );
}
