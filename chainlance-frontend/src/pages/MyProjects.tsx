import { useState } from 'react';

type TabType = 'active' | 'pending' | 'completed';

interface Project {
    id: string;
    title: string;
    client: string;
    freelancer: string;
    status: TabType;
    budget: number;
    progress: number;
}

export default function MyProjects() {
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [userRole] = useState<'client' | 'freelancer'>('freelancer');

    // Dummy projects data
    const projects: Project[] = [
        {
            id: '1',
            title: 'Build E-commerce Platform',
            client: '0x742d...3e4f',
            freelancer: '0xabc1...def2',
            status: 'active',
            budget: 5000,
            progress: 50
        },
        {
            id: '2',
            title: 'Smart Contract Audit',
            client: '0x891a...7b2c',
            freelancer: '0xabc1...def2',
            status: 'active',
            budget: 2500,
            progress: 25
        },
        {
            id: '3',
            title: 'Mobile App UI/UX Design',
            client: '0x456c...9d1e',
            freelancer: '0xabc1...def2',
            status: 'completed',
            budget: 3000,
            progress: 100
        }
    ];

    const filteredProjects = projects.filter(p => p.status === activeTab);

    return (
        <div className="my-projects-container">
            <header className="projects-header">
                <h1>My Projects</h1>
                <div className="role-badge">{userRole}</div>
            </header>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    Active ({projects.filter(p => p.status === 'active').length})
                </button>
                <button
                    className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending ({projects.filter(p => p.status === 'pending').length})
                </button>
                <button
                    className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed ({projects.filter(p => p.status === 'completed').length})
                </button>
            </div>

            <div className="projects-list">
                {filteredProjects.length === 0 ? (
                    <div className="empty-state">
                        <p>No {activeTab} projects</p>
                    </div>
                ) : (
                    filteredProjects.map(project => (
                        <div key={project.id} className="project-card">
                            <div className="project-header">
                                <h3>{project.title}</h3>
                                <span className="status-badge">{project.status}</span>
                            </div>

                            <div className="project-details">
                                <div className="detail-row">
                                    <span className="label">Client:</span>
                                    <span className="value">{project.client}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Freelancer:</span>
                                    <span className="value">{project.freelancer}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Budget:</span>
                                    <span className="value">${project.budget}</span>
                                </div>
                            </div>

                            <div className="progress-section">
                                <div className="progress-header">
                                    <span>Progress</span>
                                    <span>{project.progress}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${project.progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="project-actions">
                                <button className="action-btn">View Workspace</button>
                                {userRole === 'client' && activeTab === 'active' && (
                                    <button className="action-btn secondary">Release Payment</button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
