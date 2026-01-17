import React from 'react';

type TrustState = 'draft' | 'secure' | 'released' | 'disputed';

interface TrustBadgeProps {
    state: TrustState;
    showLabel?: boolean;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ state, showLabel = true }) => {
    const configs = {
        draft: {
            color: 'var(--color-fg)',
            icon: (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            ),
            label: 'Setup'
        },
        secure: {
            color: 'var(--color-locked)',
            icon: (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            ),
            label: 'Trusted'
        },
        released: {
            color: 'var(--color-paid)',
            icon: (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
            label: 'Paid'
        },
        disputed: {
            color: 'var(--color-disputed)',
            icon: (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            label: 'Dispute'
        }
    };

    const config = configs[state];

    return (
        <div className={`trust-badge ${state}`}>
            <span className="badge-icon">{config.icon}</span>
            {showLabel && <span className="badge-label">{config.label}</span>}

            <style>{`
        .trust-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .trust-badge.secure {
          background: rgba(var(--color-locked), 0.1);
          border-color: var(--color-locked);
          color: var(--color-locked);
          box-shadow: 0 0 10px rgba(74, 158, 255, 0.2);
        }

        .trust-badge.released {
          border-color: var(--color-paid);
          color: var(--color-paid);
        }

        .trust-badge.disputed {
          border-color: var(--color-disputed);
          color: var(--color-disputed);
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }

        .badge-icon {
          display: flex;
          align-items: center;
        }

        .badge-label {
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
        </div>
    );
};
