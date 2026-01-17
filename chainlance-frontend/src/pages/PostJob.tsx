import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { JobsService } from '../services/jobs.service';

interface Milestone {
    id: string;
    title: string;
    amount: number;
}

export default function PostJob() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        totalBudget: 0,
        requiredSkills: ''
    });

    const [milestones, setMilestones] = useState<Milestone[]>([
        { id: '1', title: '', amount: 0 }
    ]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [clientId, setClientId] = useState<string | null>(null);

    useEffect(() => {
        // Simple auth check simulation
        // In real app, check generic AuthContext
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const userStr = localStorage.getItem('cl_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setClientId(user.id);
        } else {
            setError("Please connect your wallet on the Marketplace first.");
        }
    };

    const addMilestone = () => {
        setMilestones([
            ...milestones,
            { id: Date.now().toString(), title: '', amount: 0 }
        ]);
    };

    const removeMilestone = (id: string) => {
        setMilestones(milestones.filter(m => m.id !== id));
    };

    const updateMilestone = (id: string, field: 'title' | 'amount', value: string | number) => {
        setMilestones(milestones.map(m =>
            m.id === id ? { ...m, [field]: value } : m
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!clientId) {
            setError("Please connect your wallet first.");
            return;
        }

        const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0);

        if (totalMilestoneAmount !== formData.totalBudget) {
            setError('Milestone amounts must equal total budget');
            return;
        }

        setLoading(true);
        try {
            await JobsService.createJob({
                clientId: clientId,
                title: formData.title,
                description: formData.description,
                budget: formData.totalBudget,
                requiredSkills: formData.requiredSkills.split(',').map(s => s.trim()),
            });
            // Ideally we also save milestones here? 
            // The current Job model implies milestones are separate or part of Project later?
            // User flow: Job Posted -> Proposal Accepted -> Project Created -> Milestones Created.
            // So for "Posting a Job", we just store the generic job info. 
            // The "Milestones" input here acts as a "Plan" but isn't strictly enforced until Project creation 
            // OR we store them in Job metadata. 
            // For MVP, we'll ignore storing milestones in Job, or add a 'milestones' field to Job if needed.
            // Let's assume standard flow: Job is generic. Milestones are agreed upon in Proposal/Project.

            alert('Job posted successfully! (Escrow funding happens when a freelancer is hired)');
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError('Failed to post job: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="post-job-container">
            <h1>Post a New Job</h1>

            <form onSubmit={handleSubmit} className="job-form">
                <div className="form-section">
                    <h2>Job Details</h2>

                    <div className="form-group">
                        <label>Job Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Build E-commerce Platform"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the work you need done..."
                            rows={6}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Required Skills (comma separated)</label>
                        <input
                            type="text"
                            value={formData.requiredSkills}
                            onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                            placeholder="React, Solidity, Design"
                        />
                    </div>

                    <div className="form-group">
                        <label>Total Budget (USD) *</label>
                        <input
                            type="number"
                            value={formData.totalBudget || ''}
                            onChange={(e) => setFormData({ ...formData, totalBudget: Number(e.target.value) })}
                            placeholder="5000"
                            min="0"
                            required
                        />
                    </div>
                </div>

                <div className="form-section">
                    <h2>Project Milestones Plan</h2>
                    <p className="helper-text">Define preliminary milestones. These will be finalized when you hire.</p>

                    {milestones.map((milestone, index) => (
                        <div key={milestone.id} className="milestone-input">
                            <span className="milestone-number">#{index + 1}</span>
                            <input
                                type="text"
                                placeholder="Milestone title"
                                value={milestone.title}
                                onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Amount"
                                value={milestone.amount || ''}
                                onChange={(e) => updateMilestone(milestone.id, 'amount', Number(e.target.value))}
                                min="0"
                                required
                            />
                            {milestones.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeMilestone(milestone.id)}
                                    className="remove-btn"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}

                    <button type="button" onClick={addMilestone} className="add-milestone-btn">
                        + Add Milestone
                    </button>
                </div>

                {error && (
                    <div className="error-alert">
                        {error}
                    </div>
                )}

                <div className="form-actions">
                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? 'Posting...' : 'Post Job Opportunity'}
                    </button>
                </div>
            </form>
        </div>
    );
}
