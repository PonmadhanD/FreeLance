import { useState } from 'react';

interface Transaction {
    id: string;
    type: 'escrow_funded' | 'milestone_paid' | 'refund';
    amount: number;
    timestamp: string;
    txHash: string;
    status: 'confirmed' | 'pending' | 'failed';
}

export default function AccountWallet() {
    const [networkStatus] = useState({
        connected: true,
        chainId: 11155111, // Sepolia testnet
        chainName: 'Sepolia'
    });

    const [walletInfo] = useState({
        address: '0xabc1...def2',
        balance: 2.5, // ETH
        usdBalance: 4750
    });

    const transactions: Transaction[] = [
        {
            id: '1',
            type: 'milestone_paid',
            amount: 1000,
            timestamp: '2026-01-15T14:30:00',
            txHash: '0x123abc...789def',
            status: 'confirmed'
        },
        {
            id: '2',
            type: 'escrow_funded',
            amount: -5000,
            timestamp: '2026-01-10T09:15:00',
            txHash: '0x456ghi...012jkl',
            status: 'confirmed'
        },
        {
            id: '3',
            type: 'milestone_paid',
            amount: 1500,
            timestamp: '2026-01-05T16:45:00',
            txHash: '0x789mno...345pqr',
            status: 'confirmed'
        }
    ];

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

    return (
        <div className="account-container">
            <header className="account-header">
                <h1>Account & Wallet</h1>
                {networkStatus.connected ? (
                    <div className="network-status connected">
                        <span className="status-dot"></span>
                        <span>{networkStatus.chainName}</span>
                    </div>
                ) : (
                    <div className="network-status disconnected">
                        <span className="status-dot"></span>
                        <span>Disconnected</span>
                    </div>
                )}
            </header>

            <div className="wallet-card">
                <div className="wallet-header">
                    <span className="wallet-label">Wallet Address</span>
                    <code className="wallet-address">{walletInfo.address}</code>
                </div>

                <div className="balance-section">
                    <div className="balance-primary">
                        <span className="balance-value">{walletInfo.balance} ETH</span>
                    </div>
                    <div className="balance-secondary">
                        ≈ ${walletInfo.usdBalance.toLocaleString()} USD
                    </div>
                </div>

                {networkStatus.chainId !== 11155111 && networkStatus.chainId !== 137 && (
                    <div className="network-warning">
                        ⚠️ Please switch to Sepolia or Polygon to continue
                    </div>
                )}
            </div>

            <section className="transactions-section">
                <h2>Transaction History</h2>

                {transactions.length === 0 ? (
                    <div className="empty-state">
                        <p>No transactions yet</p>
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
                                            {tx.txHash}
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
        </div>
    );
}
