import { useState, useEffect } from 'react';
import { ProjectsService } from '../services/projects.service';
import type { Project } from '../services/projects.service';
import { JobsService, type Job } from '../services/jobs.service';
import { useNavigate } from 'react-router-dom';
import { TrustBadge } from '../components/TrustBadge';

type TabType = 'postings' | 'active' | 'completed' | 'disputed';

export default function MyProjects() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('postings');
    const [projects, setProjects] = useState<Project[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'client' | 'freelancer' | 'both'>('freelancer');

    useEffect(() => {
        const userStr = localStorage.getItem('cl_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
            // Default to postings for clients
            if (user.role === 'client' || user.role === 'both') {
                setActiveTab('postings');
            } else {
                setActiveTab('active');
            }
        }
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('cl_user');
            const user = userStr ? JSON.parse(userStr) : null;

            const [projectsData, jobsData] = await Promise.all([
                ProjectsService.getMyProjects(),
                user ? JobsService.getJobs({ clientId: user.id }) : Promise.resolve([])
            ]);

            setProjects(projectsData);
            setJobs(jobsData);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(p => {
        if (activeTab === 'active') return p.status === 'active';
        if (activeTab === 'completed') return p.status === 'completed';
        if (activeTab === 'disputed') return p.status === 'disputed';
        return false;
    });

    const calculateProgress = (project: Project) => {
        if (!project.milestones || project.milestones.length === 0) return 0;
        const paid = project.milestones.filter(m => m.status === 'paid').length;
        return Math.round((paid / project.milestones.length) * 100);
    };

    if (loading) return <div className="my-projects-container"><p>Loading projects...</p></div>;

    return (
        <div className="my-projects-container">
            <header className="projects-header">
                <div>
                    <h1>My Projects</h1>
                    <p className="subtitle">Track your commitments and escrows</p>
                </div>
                <div className="role-badge glass-panel">{userRole.toUpperCase()}</div>
            </header>

            <div className="tabs glass-panel">
                {(userRole === 'client' || userRole === 'both') && (
                    <button
                        className={`tab ${activeTab === 'postings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('postings')}
                    >
                        My Postings ({jobs.length})
                    </button>
                )}
                <button
                    className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    Active Projects ({projects.filter(p => p.status === 'active').length})
                </button>
                <button
                    className={`tab ${activeTab === 'disputed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('disputed')}
                >
                    Disputed ({projects.filter(p => p.status === 'disputed').length})
                </button>
                <button
                    className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed ({projects.filter(p => p.status === 'completed').length})
                </button>
            </div>

            <div className="projects-list">
                {activeTab === 'postings' ? (
                    jobs.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <p>You haven't posted any jobs yet.</p>
                            <button onClick={() => navigate('/post-job')} className="action-btn">Post a Job</button>
                        </div>
                    ) : (
                        jobs.map(job => (
                            <div key={job.id} className="project-card glass-panel job-posting-card">
                                <div className="project-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <TrustBadge state="draft" />
                                        <h3>{job.title}</h3>
                                    </div>
                                    <span className={`status-badge status-${job.status}`}>{job.status.toUpperCase()}</span>
                                </div>
                                <div className="project-details">
                                    <div className="detail-row">
                                        <span className="label">Budget:</span>
                                        <span className="value text-highlight">${Number(job.budget).toLocaleString()}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Proposals:</span>
                                        <span className="value">{job._count?.proposals || 0} applications</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Posted:</span>
                                        <span className="value">{new Date(job.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="project-actions">
                                    <button
                                        className="action-btn"
                                        onClick={() => navigate(`/job/${job.id}`)}
                                    >
                                        View Details & Proposals
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                ) : (
                    filteredProjects.length === 0 ? (
                        <div className="empty-state glass-panel">
                            <p>No {activeTab} projects found.</p>
                            {activeTab === 'active' && <button onClick={() => navigate('/')} className="action-btn">Browse Marketplace</button>}
                        </div>
                    ) : (
                        filteredProjects.map(project => (
                            <div key={project.id} className="project-card glass-panel">
                                <div className="project-header">
                                    <h3>{project.job?.title || "Untitled Project"}</h3>
                                    <span className={`status-badge ${project.status}`}>{project.status.toUpperCase()}</span>
                                </div>

                                <div className="project-details">
                                    <div className="detail-row">
                                        <span className="label">Client:</span>
                                        <span className="value">{project.client?.displayName || project.clientId.slice(0, 8)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Freelancer:</span>
                                        <span className="value">{project.freelancer?.displayName || project.freelancerId.slice(0, 8)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Total Value:</span>
                                        <span className="value text-highlight">${Number(project.totalAmount).toLocaleString()}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Started:</span>
                                        <span className="value">{new Date(project.startedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="progress-section">
                                    <div className="progress-header">
                                        <span>Milestone Progression</span>
                                        <span>{calculateProgress(project)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${calculateProgress(project)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="project-actions">
                                    <button
                                        className="action-btn"
                                        onClick={() => navigate(`/workspace/${project.id}`)}
                                    >
                                        Enter Workspace
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            <style>{`
                .my-projects-container {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .projects-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 3rem;
                }
                .subtitle {
                    color: #888;
                    margin-top: 0.5rem;
                }
                .role-badge {
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 0.8rem;
                    letter-spacing: 1px;
                }
                .tabs {
                    display: flex;
                    gap: 1rem;
                    padding: 0.5rem;
                    margin-bottom: 2rem;
                    border-radius: 12px;
                }
                .tab {
                    padding: 0.8rem 1.5rem;
                    border: none;
                    background: transparent;
                    color: #888;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s;
                    font-weight: 600;
                }
                .tab.active {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .projects-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 2rem;
                }
                .project-card {
                    padding: 1.5rem;
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .project-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .status-badge {
                    font-size: 0.7rem;
                    padding: 0.3rem 0.6rem;
                    border-radius: 4px;
                    font-weight: bold;
                }
                .status-badge.active { background: rgba(74, 158, 255, 0.2); color: #4a9eff; }
                .status-badge.disputed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                .status-badge.completed { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
                .status-badge.status-open { background: rgba(74, 158, 255, 0.1); color: #4a9eff; }
                .status-badge.status-in_progress { background: rgba(74, 222, 128, 0.1); color: #4ade80; }

                .project-details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                }
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.9rem;
                }
                .label { color: #888; }
                .value { color: #ddd; font-weight: 500; }
                
                .progress-section {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.8rem;
                    color: #888;
                }
                .progress-bar {
                    height: 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: var(--color-locked);
                    box-shadow: 0 0 10px var(--color-locked);
                }

                .project-actions {
                    margin-top: auto;
                }
                .action-btn {
                    width: 100%;
                    padding: 0.8rem;
                    background: var(--color-liquid);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                .action-btn:hover { opacity: 0.9; }
                .empty-state {
                    grid-column: 1 / -1;
                    padding: 4rem;
                    text-align: center;
                    color: #888;
                }
                .text-highlight { color: var(--color-liquid); }
            `}</style>
        </div>
    );
}
