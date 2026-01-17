// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainLanceEscrow
 * @dev Simple milestone-based escrow system
 */
contract ChainLanceEscrow {
    
    struct EscrowTransaction {
        string milestoneId;
        address client;
        address freelancer;
        uint256 amount;
        bool isReleased;
        bool isRefunded;
        uint256 createdAt;
    }

    // milestoneId -> EscrowTransaction
    mapping(string => EscrowTransaction) public escrows;

    event EscrowCreated(string indexed milestoneId, address indexed client, address indexed freelancer, uint256 amount);
    event EscrowReleased(string indexed milestoneId, address indexed freelancer, uint256 amount);
    event EscrowRefunded(string indexed milestoneId, address indexed client, uint256 amount);

    /**
     * @notice Create a new escrow for a specific milestone
     * @param _milestoneId Unique ID from Firestore
     * @param _freelancer Address of the freelancer
     */
    function createEscrow(string memory _milestoneId, address _freelancer) external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(escrows[_milestoneId].amount == 0, "Escrow already exists for this milestone");
        require(_freelancer != address(0), "Invalid freelancer address");

        escrows[_milestoneId] = EscrowTransaction({
            milestoneId: _milestoneId,
            client: msg.sender,
            freelancer: _freelancer,
            amount: msg.value,
            isReleased: false,
            isRefunded: false,
            createdAt: block.timestamp
        });

        emit EscrowCreated(_milestoneId, msg.sender, _freelancer, msg.value);
    }

    /**
     * @notice Release funds to freelancer
     * @param _milestoneId Unique ID of the milestone
     */
    function release(string memory _milestoneId) external {
        EscrowTransaction storage escrow = escrows[_milestoneId];
        
        require(msg.sender == escrow.client, "Only client can release funds");
        require(!escrow.isReleased, "Funds already released");
        require(!escrow.isRefunded, "Funds were refunded");
        require(escrow.amount > 0, "Escrow does not exist");

        escrow.isReleased = true;
        
        (bool success, ) = payable(escrow.freelancer).call{value: escrow.amount}("");
        require(success, "Transfer failed");

        emit EscrowReleased(_milestoneId, escrow.freelancer, escrow.amount);
    }

    /**
     * @notice Refund funds to client (Requires logic for dispute resolution in real app)
     * @dev For MVP, allowing client to refund if not released (Simulating Admin/Arbiter for now, or mutual cancellation)
     * @param _milestoneId Unique ID of the milestone
     */
    function refund(string memory _milestoneId) external {
        EscrowTransaction storage escrow = escrows[_milestoneId];
        
        require(msg.sender == escrow.client, "Only client can refund"); // In reality, this should be arbiter or mutual
        require(!escrow.isReleased, "Funds already released");
        require(!escrow.isRefunded, "Funds already refunded");
        require(escrow.amount > 0, "Escrow does not exist");

        escrow.isRefunded = true;

        (bool success, ) = payable(escrow.client).call{value: escrow.amount}("");
        require(success, "Transfer failed");

        emit EscrowRefunded(_milestoneId, escrow.client, escrow.amount);
    }

    /**
     * @notice Get escrow details
     */
    function getEscrow(string memory _milestoneId) external view returns (EscrowTransaction memory) {
        return escrows[_milestoneId];
    }
}
