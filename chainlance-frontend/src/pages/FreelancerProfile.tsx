import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthService } from '../services/auth.service';

export default function FreelancerProfile() {
    const { walletAddress } = useParams<{ walletAddress: string }>();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!walletAddress) return;
            setLoading(true);
            try {
                const data = await AuthService.getUserProfile(walletAddress);
                setProfile(data);
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [walletAddress]);

    if (loading) {
        return <div className="profile-page-container"><p>Loading profile...</p></div>;
    }

    if (!profile) {
        return (
            <div className="profile-page-container">
                <div className="error-card glass-panel">
                    <h2>Profile Not Found</h2>
                    <p>We couldn't find a freelancer profile associated with this address: <code>{walletAddress}</code></p>
                    <Link to="/" className="btn-primary">Back to Marketplace</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page-container">
            <header className="profile-header">
                <div className="header-content">
                    <div className="avatar-placeholder">
                        {profile.displayName?.charAt(0) || profile.walletAddress.substring(2, 4)}
                    </div>
                    <div className="user-info">
                        <h1>{profile.displayName || 'Anonymous Freelancer'}</h1>
                        <code className="wallet-addr">{profile.walletAddress}</code>
                        <div className="role-badge">{profile.role}</div>
                    </div>
                </div>
            </header>

            <div className="profile-content-grid">
                <div className="main-info glass-panel">
                    <h3>About / "Gig" Description</h3>
                    <div className="bio-text">
                        {profile.bio || "No description provided."}
                    </div>

                    <div className="skills-section">
                        <h3>Expertise</h3>
                        <div className="skill-tags">
                            {profile.skills && (Array.isArray(profile.skills) ? profile.skills : [profile.skills]).map((skill: string) => (
                                <span key={skill} className="skill-tag">{skill}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="side-info">
                    <div className="stats-card glass-panel">
                        <h3>Trust Stats</h3>
                        <div className="stat-item">
                            <span className="stat-label">Member Since</span>
                            <span className="stat-value">{new Date(profile.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Projects Completed</span>
                            <span className="stat-value">0</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Earned</span>
                            <span className="stat-value">0 ETH</span>
                        </div>
                    </div>

                    <div className="action-card glass-panel">
                        <h3>Contact</h3>
                        <p>Interested in working together?</p>
                        <button className="btn-primary full-width" disabled>Send Message (Coming Soon)</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
