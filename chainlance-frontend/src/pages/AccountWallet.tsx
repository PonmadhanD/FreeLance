import { useState, useEffect } from 'react';
import { Web3Service } from '../services/web3.service';
import { AuthService } from '../services/auth.service';
import { ethers } from 'ethers';

interface Transaction {
    id: string;
    type: 'escrow_funded' | 'milestone_paid' | 'refund';
    amount: number;
    timestamp: string;
    txHash: string;
    status: 'confirmed' | 'pending' | 'failed';
}

export default function AccountWallet() {
    const [connected, setConnected] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<string>('0');
    const [network, setNetwork] = useState<{ chainId: bigint; name: string } | null>(null);
    const [loading, setLoading] = useState(true);

    // Profile State
    const [user, setUser] = useState<any>(null);
    const [editMode, setEditMode] = useState(false);
    const [profileData, setProfileData] = useState({
        displayName: '',
        bio: '',
        skills: ''
    });
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        const init = async () => {
            await checkConnection();
            const currentUser = await AuthService.getUser();
            if (currentUser) {
                setUser(currentUser);
                setProfileData({
                    displayName: currentUser.displayName || '',
                    bio: currentUser.bio || '',
                    skills: Array.isArray(currentUser.skills) ? currentUser.skills.join(', ') : (currentUser.skills || '')
                });
            }
        };
        init();

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', () => window.location.reload());
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            }
        };
    }, []);

    const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
            setConnected(false);
            setAddress(null);
        } else {
            checkConnection();
        }
    };

    const checkConnection = async () => {
        setLoading(true);
        try {
            const connectedAddress = await Web3Service.isWalletConnected();
            if (connectedAddress) {
                setAddress(connectedAddress);
                setConnected(true);
                const net = await Web3Service.getNetwork();
                setNetwork(net);

                // Fetch balance
                const provider = new ethers.BrowserProvider(window.ethereum);
                const bal = await provider.getBalance(connectedAddress);
                setBalance(ethers.formatEther(bal));
            } else {
                setConnected(false);
            }
        } catch (error) {
            console.error("Connection check failed", error);
        } finally {
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        setLoading(true);
        try {
            const addr = await Web3Service.connectWallet();
            setAddress(addr);
            setConnected(true);
            const net = await Web3Service.getNetwork();
            setNetwork(net);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const bal = await provider.getBalance(addr);
            setBalance(ethers.formatEther(bal));

            // Also trigger auth login if needed
            const loggedInUser = await AuthService.loginWithWallet(addr);
            setUser(loggedInUser);
            setProfileData({
                displayName: loggedInUser.displayName || '',
                bio: loggedInUser.bio || '',
                skills: Array.isArray(loggedInUser.skills) ? loggedInUser.skills.join(', ') : (loggedInUser.skills || '')
            });
        } catch (error) {
            console.error("Wallet connection failed", error);
            alert("Connection failed: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const saveProfile = async () => {
        setSavingProfile(true);
        try {
            const updated = await AuthService.updateProfile({
                displayName: profileData.displayName,
                bio: profileData.bio,
                skills: profileData.skills.split(',').map(s => s.trim()).filter(s => s !== '')
            });
            setUser(updated);
            setEditMode(false);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Profile update failed", error);
            alert("Update failed: " + (error as Error).message);
        } finally {
            setSavingProfile(false);
        }
    };

    const transactions: Transaction[] = []; // Real transactions would be fetched from events or an indexer

    const getTransactionIcon = (type: Transaction['type']) => {
        const icons = {
            escrow_funded: '📤',
            milestone_paid: '📥',
            refund: '↩️'
        };
        return icons[type];
    };

    const getTransactionLabel = (type: Transaction['type']) => {
        const labels = {
            escrow_funded: 'Escrow Funded',
            milestone_paid: 'Milestone Payment',
            refund: 'Refund Received'
        };
        return labels[type];
    };

    if (loading && !address) {
        return <div className="account-container"><p>Loading wallet info...</p></div>;
    }

    return (
        <div className="account-container">
            <header className="account-header">
                <h1>Account & Profile</h1>
                {connected ? (
                    <div className="network-status connected">
                        <span className="status-dot"></span>
                        <span>{network?.name || 'Connected'}</span>
                    </div>
                ) : (
                    <div className="network-status disconnected">
                        <span className="status-dot"></span>
                        <span>Disconnected</span>
                    </div>
                )}
            </header>

            {!connected ? (
                <div className="connect-prompt glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2>Wallet Not Connected</h2>
                    <p>Connect your wallet to see your balance, profile, and transaction history.</p>
                    <button
                        onClick={connectWallet}
                        className="connect-wallet-btn"
                        style={{ marginTop: '1rem', padding: '1rem 2rem', fontSize: '1.1rem' }}
                    >
                        Connect MetaMask
                    </button>
                </div>
            ) : (
                <>
                    <div className="account-grid">
                        <div className="wallet-card glass-panel">
                            <h3>Wallet Details</h3>
                            <div className="wallet-header">
                                <span className="wallet-label">Address</span>
                                <code className="wallet-address">{address}</code>
                            </div>

                            <div className="balance-section">
                                <div className="balance-primary">
                                    <span className="balance-value">{parseFloat(balance).toFixed(4)} ETH</span>
                                </div>
                            </div>

                            {network?.chainId !== 11155111n && (
                                <div className="network-warning" style={{ background: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', padding: '10px', borderRadius: '4px', marginTop: '1rem' }}>
                                    ⚠️ Recommended: Switch to Sepolia Testnet
                                </div>
                            )}
                        </div>

                        <div className="profile-card glass-panel">
                            <div className="card-header-with-action">
                                <h3>Service Profile</h3>
                                {!editMode ? (
                                    <button onClick={() => setEditMode(true)} className="btn-secondary btn-small">Edit Profile</button>
                                ) : (
                                    <div className="edit-actions">
                                        <button onClick={() => setEditMode(false)} className="btn-ghost btn-small">Cancel</button>
                                        <button onClick={saveProfile} disabled={savingProfile} className="btn-primary btn-small">
                                            {savingProfile ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {editMode ? (
                                <div className="profile-edit-form">
                                    <div className="form-group">
                                        <label>Display Name</label>
                                        <input
                                            type="text"
                                            value={profileData.displayName}
                                            onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                                            placeholder="Your name or agency"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Bio (Your "Gig" Description)</label>
                                        <textarea
                                            value={profileData.bio}
                                            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                            placeholder="Describe your services and experience..."
                                            rows={4}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Skills (Comma separated)</label>
                                        <input
                                            type="text"
                                            value={profileData.skills}
                                            onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                                            placeholder="React, Solidty, Node.js..."
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="profile-view">
                                    <div className="profile-main">
                                        <h4>{user?.displayName || 'Anonymous User'}</h4>
                                        <p className="profile-role">{user?.role === 'both' ? 'Freelancer & Client' : user?.role}</p>
                                        <div className="profile-bio">
                                            {user?.bio ? user.bio : <span className="placeholder">No bio added yet. Tell us about your services!</span>}
                                        </div>
                                    </div>
                                    <div className="profile-skills">
                                        {user?.skills && (Array.isArray(user.skills) ? user.skills : [user.skills]).map((skill: string) => (
                                            <span key={skill} className="skill-tag">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <section className="transactions-section">
                        <h2>Transaction History</h2>

                        {transactions.length === 0 ? (
                            <div className="empty-state">
                                <p>No on-chain transactions found for this wallet on {network?.name}.</p>
                            </div>
                        ) : (
                            <div className="transactions-list">
                                {transactions.map(tx => (
                                    <div key={tx.id} className={`transaction-item status-${tx.status}`}>
                                        <div className="tx-icon">{getTransactionIcon(tx.type)}</div>

                                        <div className="tx-details">
                                            <div className="tx-type">{getTransactionLabel(tx.type)}</div>
                                            <div className="tx-timestamp">
                                                {new Date(tx.timestamp).toLocaleDateString()} at{' '}
                                                {new Date(tx.timestamp).toLocaleTimeString()}
                                            </div>
                                            <div className="tx-hash">
                                                <a
                                                    href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {tx.txHash.substring(0, 10)}...{tx.txHash.substring(tx.txHash.length - 8)}
                                                </a>
                                            </div>
                                        </div>

                                        <div className={`tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                                            {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount)}
                                        </div>

                                        <div className={`tx-status status-${tx.status}`}>
                                            {tx.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
