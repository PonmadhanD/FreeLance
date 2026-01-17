import React from 'react';

interface Milestone {
    id: string;
    status: 'pending' | 'in-progress' | 'completed' | 'paid';
    title: string;
    amount: number;
}

interface MilestoneSpireProps {
    milestones: Milestone[];
    activeIndex?: number;
}

export const MilestoneSpire: React.FC<MilestoneSpireProps> = ({ milestones, activeIndex = 0 }) => {
    return (
        <div className="milestone-spire-container">
            <div className="spire-track">
                <div
                    className="spire-progress-line"
                    style={{ height: `${(activeIndex / (milestones.length - 1)) * 100}%` }}
                />
            </div>

            <div className="spire-nodes">
                {milestones.map((milestone, index) => {
                    const isCompleted = index <= activeIndex;
                    const isActive = index === activeIndex;

                    return (
                        <div
                            key={milestone.id}
                            className={`spire-node ${milestone.status} ${isActive ? 'active' : ''}`}
                        >
                            <div className="node-marker">
                                <div className={`crystal-shape ${isCompleted ? 'crystallized' : 'raw'}`} />
                                {isActive && <div className="pulse-ring" />}
                            </div>

                            <div className="node-content glass-panel">
                                <span className="node-index">0{index + 1}</span>
                                <div className="node-info">
                                    <h4>{milestone.title}</h4>
                                    <span className="node-amount">${milestone.amount}</span>
                                </div>
                                <div className="node-status-icon">
                                    {/* Icon renders based on CSS classes */}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
        .milestone-spire-container {
          position: relative;
          padding-left: 50px;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .spire-track {
          position: absolute;
          left: 19px; /* Aligned with marker center */
          top: 20px;
          bottom: 20px;
          width: 2px;
          background: rgba(255, 255, 255, 0.1);
          z-index: 0;
        }

        .spire-progress-line {
          width: 100%;
          background: var(--color-liquid);
          box-shadow: 0 0 10px var(--color-liquid);
          transition: height 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .spire-node {
          position: relative;
          z-index: 1;
          opacity: 0.5;
          transition: opacity 0.3s;
        }

        .spire-node.in-progress,
        .spire-node.completed,
        .spire-node.paid,
        .spire-node.active {
          opacity: 1;
        }

        .node-marker {
          position: absolute;
          left: -38px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crystal-shape {
          width: 12px;
          height: 12px;
          transform: rotate(45deg);
          border: 2px solid #555;
          background: var(--color-bg);
          transition: all 0.5s ease;
        }

        .crystal-shape.crystallized {
          border-color: var(--color-liquid);
          background: var(--color-liquid);
          box-shadow: 0 0 8px var(--color-liquid);
        }

        .pulse-ring {
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid var(--color-liquid);
          animation: ripple 2s infinite;
        }

        .node-content {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.2rem;
        }

        .node-index {
          font-family: monospace;
          color: #555;
          font-size: 1.2rem;
        }

        .node-info h4 {
          margin: 0;
          font-weight: 500;
          color: #fff;
        }

        .node-amount {
          font-size: 0.9rem;
          color: var(--color-locked);
          font-family: monospace;
        }

        @keyframes ripple {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
        </div>
    );
};
