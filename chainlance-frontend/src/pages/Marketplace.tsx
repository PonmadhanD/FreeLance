import { useState, useEffect } from 'react';
import { TrustBadge } from '../components/TrustBadge';
import { JobsService } from '../services/jobs.service';
import type { Job } from '../services/jobs.service';
import { AuthService } from '../services/auth.service';
import { SeedService } from '../services/seed.service';

export default function Marketplace() {
    const [walletConnected, setWalletConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [userAddress, setUserAddress] = useState<string | null>(null);

    useEffect(() => {
        const checkSession = async () => {
            const userStr = localStorage.getItem('cl_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setUserAddress(user.walletAddress);
                setWalletConnected(true);
            }
            loadJobs();
        };
        checkSession();
    }, []);

    const loadJobs = async () => {
        try {
            const fetchedJobs = await JobsService.getJobs({ status: 'open' });
            setJobs(fetchedJobs);
        } catch (error) {
            console.error("Failed to load jobs", error);
        }
    };



    const handleSeed = async () => {
        setLoading(true);
        try {
            await SeedService.seedDatabase();
            loadJobs();
        } catch (error) {
            console.error("Seeding failed", error);
        } finally {
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        setLoading(true);
        try {
            // Mock address for demo purposes if no extension
            const mockAddress = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
            let address = mockAddress;

            // Basic Window Ethereum check
            if ((window as any).ethereum) {
                const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                address = accounts[0];
            }

            const user = await AuthService.loginWithWallet(address);
            setUserAddress(user.walletAddress);
            setWalletConnected(true);
        } catch (error) {
            console.error("Wallet connection failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="marketplace-container">
            <header className="marketplace-header">
                <div className="brand">
                    <h1>ChainLance</h1>
                    <span className="subtitle">Workflow Visualization Market</span>
                </div>
                {!walletConnected ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleSeed}
                            disabled={loading}
                            className="seed-btn glass-panel"
                            style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Seed Demo Data
                        </button>
                        <button
                            onClick={connectWallet}
                            disabled={loading}
                            className="connect-wallet-btn"
                        >
                            {loading ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    </div>
                ) : (
                    <div className="wallet-status glass-panel">
                        <span className="status-indicator"></span>
                        <span className="address">
                            {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                        </span>
                    </div>
                )}
            </header>

            <div className="search-filters">
                <input
                    type="text"
                    placeholder="Find a commitment..."
                    className="search-input glass-panel"
                />
            </div>

            <div className="jobs-grid">
                {jobs.length === 0 ? (
                    <div className="empty-state">No active opportunities found. Be the first to post!</div>
                ) : (
                    jobs.map(job => (
                        <div key={job.id} className="job-card glass-panel">
                            <div className="card-header">
                                <TrustBadge state={'draft'} />
                                <span className="budget text-highlight">${Number(job.budget).toLocaleString()}</span>
                            </div>

                            <h3>{job.title}</h3>

                            <div className="milestone-preview">
                                <div className="milestone-string">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="milestone-dot" title={`Milestone ${i + 1}`} />
                                    ))}
                                </div>
                                <span className="milestone-count">Est. Metrics</span>
                            </div>

                            <div className="card-footer">
                                <span className="client-id">
                                    By: {job.client?.displayName || job.client?.walletAddress?.slice(0, 6) || "Client"}
                                </span>
                                <button className="apply-btn action-btn">Inspect Contract</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style>{`
                .marketplace-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3rem;
                }
                
                .brand h1 {
                    font-size: 2.5rem;
                    background: linear-gradient(to right, #4a9eff, #4ade80);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .subtitle {
                    color: #666;
                    font-size: 0.9rem;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }

                .job-card {
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .job-card:hover {
                    box-shadow: 0 10px 30px -10px rgba(74, 158, 255, 0.2);
                    border-color: var(--color-locked);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .text-highlight {
                    color: var(--color-liquid);
                    font-weight: 700;
                    font-size: 1.2rem;
                    font-family: monospace;
                }

                .milestone-preview {
                    margin: 1.5rem 0;
                    padding: 1rem;
                    background: rgba(0,0,0,0.3);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .milestone-string {
                    display: flex;
                    gap: 4px;
                    flex: 1;
                }

                .milestone-dot {
                    height: 8px;
                    flex: 1;
                    background: #333;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .job-card:hover .milestone-dot {
                    background: var(--color-locked);
                }

                .milestone-count {
                    font-size: 0.8rem;
                    color: #888;
                }

                .card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 1rem;
                    font-size: 0.9rem;
                    color: #666;
                    opacity: 0.8;
                }
                
                .action-btn {
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    border-radius: 4px;
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                }

                .connect-wallet-btn {
                    padding: 0.8rem 1.5rem;
                    background: var(--color-liquid);
                    color: white;
                    border: none;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: bold;
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: #666;
                    grid-column: 1 / -1;
                }

                .jobs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 2rem;
                }

                .wallet-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                }
                
                .status-indicator {
                    width: 8px;
                    height: 8px;
                    background: #4ade80;
                    border-radius: 50%;
                }
            `}</style>
        </div>
    );
}
