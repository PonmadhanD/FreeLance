import React from 'react';

interface EscrowBlockGridProps {
    totalAmount: number;
    releasedAmount: number;
    blockSize?: number;
}

export const EscrowBlockGrid: React.FC<EscrowBlockGridProps> = ({
    totalAmount,
    releasedAmount,
    blockSize = 100
}) => {
    const totalBlocks = Math.ceil(totalAmount / blockSize);
    const releasedBlocks = Math.floor(releasedAmount / blockSize);

    return (
        <div className="escrow-block-grid">
            <div className="grid-label">
                Funds Vault
                <span className="total-value">${totalAmount}</span>
            </div>

            <div className="blocks-container">
                {Array.from({ length: totalBlocks }).map((_, i) => {
                    const isReleased = i < releasedBlocks;
                    return (
                        <div
                            key={i}
                            className={`fund-block ${isReleased ? 'released' : 'locked'}`}
                            style={{ transitionDelay: `${i * 0.05}s` }}
                            title={isReleased ? 'Released to Freelancer' : 'Locked in Smart Contract'}
                        />
                    );
                })}
            </div>

            <div className="grid-legend">
                <span className="legend-item locked">Locked</span>
                <span className="legend-item released">Released</span>
            </div>

            <style>{`
        .escrow-block-grid {
          width: 100%;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .grid-label {
          display: flex;
          justify-content: space-between;
          color: #888;
          font-size: 0.8rem;
          margin-bottom: 0.8rem;
          text-transform: uppercase;
        }

        .total-value {
          color: var(--color-fg);
          font-family: monospace;
        }

        .blocks-container {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .fund-block {
          width: 12px;
          height: 24px;
          background: var(--color-bg);
          border: 1px solid var(--glass-border);
          border-radius: 2px;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .fund-block.locked {
          background: rgba(74, 158, 255, 0.2);
          border-color: var(--color-locked);
          box-shadow: 0 0 2px var(--color-locked);
        }

        .fund-block.released {
          background: var(--color-paid);
          border-color: #fff;
          transform: translateY(10px);
          opacity: 0; /* Animate out to wallet */
        }

        .grid-legend {
          display: flex;
          gap: 1rem;
          margin-top: 0.8rem;
          font-size: 0.75rem;
        }

        .legend-item::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          margin-right: 4px;
          border-radius: 50%;
        }

        .legend-item.locked::before { background: var(--color-locked); }
        .legend-item.released::before { background: var(--color-paid); }
      `}</style>
        </div>
    );
};
