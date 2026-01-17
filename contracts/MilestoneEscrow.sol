// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MilestoneEscrow
 * @author ChanceLance Team
 * @notice A milestone-based escrow contract for freelance project payments
 * @dev Implements sequential milestone approval with optional timeout-based refunds
 */
contract MilestoneEscrow is ReentrancyGuard {
    
    // ============ State Variables ============
    
    /// @notice The client funding the project
    address public immutable client;
    
    /// @notice The freelancer receiving payments
    address public immutable freelancer;
    
    /// @notice Total amount locked in escrow (in wei)
    uint256 public immutable totalAmount;
    
    /// @notice Cumulative amount released to freelancer
    uint256 public releasedAmount;
    
    /// @notice Index of the next milestone to be approved
    uint256 public currentMilestoneIndex;
    
    /// @notice Project deadline for timeout-based refunds
    uint256 public immutable projectDeadline;
    
    /// @notice Whether timeout-based refunds are enabled
    bool public immutable refundEnabled;
    
    /// @notice Current state of the escrow
    EscrowState public state;
    
    // ============ Enums and Structs ============
    
    /// @notice Possible states of the escrow contract
    enum EscrowState {
        CREATED,   // Contract deployed, awaiting funding
        FUNDED,    // Funds locked, work can begin
        ACTIVE,    // At least one milestone approved
        COMPLETED, // All milestones approved, contract finished
        REFUNDED   // Client reclaimed funds after timeout
    }
    
    /// @notice Structure representing a single milestone
    struct Milestone {
        string description;   // Human-readable description
        uint256 amount;      // Payment amount in wei
        bool approved;       // Whether client approved this milestone
        uint256 approvedAt;  // Timestamp of approval (0 if not approved)
        uint256 deadline;    // Optional individual milestone deadline
    }
    
    /// @notice Array of all project milestones
    Milestone[] public milestones;
    
    // ============ Events ============
    
    /// @notice Emitted when escrow contract is created
    event EscrowCreated(
        address indexed client,
        address indexed freelancer,
        uint256 totalAmount,
        uint256 milestoneCount
    );
    
    /// @notice Emitted when client funds the escrow
    event EscrowFunded(
        address indexed client,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice Emitted when a milestone is approved and payment released
    event MilestoneApproved(
        uint256 indexed milestoneIndex,
        uint256 amount,
        address indexed freelancer,
        uint256 timestamp
    );
    
    /// @notice Emitted when all milestones are completed
    event EscrowCompleted(
        uint256 totalReleased,
        uint256 timestamp
    );
    
    /// @notice Emitted when client reclaims funds after timeout
    event EscrowRefunded(
        address indexed client,
        uint256 refundedAmount,
        uint256 timestamp
    );
    
    // ============ Modifiers ============
    
    /// @notice Restricts function to client only
    modifier onlyClient() {
        require(msg.sender == client, "Only client can call this");
        _;
    }
    
    /// @notice Restricts function to freelancer only
    modifier onlyFreelancer() {
        require(msg.sender == freelancer, "Only freelancer can call this");
        _;
    }
    
    /// @notice Restricts function to specific escrow state
    modifier inState(EscrowState _state) {
        require(state == _state, "Invalid state for this operation");
        _;
    }
    
    /// @notice Restricts function to after project deadline
    modifier afterDeadline() {
        require(block.timestamp > projectDeadline, "Deadline not reached");
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Creates a new milestone-based escrow contract
     * @param _freelancer Address of the freelancer
     * @param _descriptions Array of milestone descriptions
     * @param _amounts Array of milestone payment amounts
     * @param _projectDeadline Unix timestamp of project deadline
     * @param _refundEnabled Whether timeout-based refunds are allowed
     */
    constructor(
        address _freelancer,
        string[] memory _descriptions,
        uint256[] memory _amounts,
        uint256 _projectDeadline,
        bool _refundEnabled
    ) {
        // Validation
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_descriptions.length == _amounts.length, "Array length mismatch");
        require(_descriptions.length > 0, "Must have at least one milestone");
        
        // Calculate total amount
        uint256 _totalAmount;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Milestone amount must be > 0");
            _totalAmount += _amounts[i];
        }
        require(_totalAmount > 0, "Total amount must be > 0");
        
        // Validate deadline if refunds enabled
        if (_refundEnabled) {
            require(_projectDeadline > block.timestamp, "Deadline must be in future");
        }
        
        // Set immutable variables
        client = msg.sender;
        freelancer = _freelancer;
        totalAmount = _totalAmount;
        projectDeadline = _projectDeadline;
        refundEnabled = _refundEnabled;
        
        // Initialize milestones
        for (uint256 i = 0; i < _descriptions.length; i++) {
            milestones.push(Milestone({
                description: _descriptions[i],
                amount: _amounts[i],
                approved: false,
                approvedAt: 0,
                deadline: 0  // Individual deadlines not implemented in V1
            }));
        }
        
        // Set initial state
        state = EscrowState.CREATED;
        
        emit EscrowCreated(client, freelancer, _totalAmount, _descriptions.length);
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Client deposits funds to activate the escrow
     * @dev Must send exact totalAmount
     */
    function fundEscrow() external payable onlyClient inState(EscrowState.CREATED) {
        require(msg.value == totalAmount, "Must send exact total amount");
        
        state = EscrowState.FUNDED;
        
        emit EscrowFunded(client, msg.value, block.timestamp);
    }
    
    /**
     * @notice Client approves a milestone, releasing payment to freelancer
     * @param _milestoneIndex Index of the milestone to approve
     * @dev Milestones must be approved sequentially
     */
    function approveMilestone(uint256 _milestoneIndex) 
        external 
        onlyClient 
        nonReentrant 
    {
        // State validation
        require(
            state == EscrowState.FUNDED || state == EscrowState.ACTIVE,
            "Escrow not active"
        );
        
        // Index validation
        require(_milestoneIndex < milestones.length, "Invalid milestone index");
        require(_milestoneIndex == currentMilestoneIndex, "Must approve sequentially");
        
        Milestone storage milestone = milestones[_milestoneIndex];
        
        // Approval validation
        require(!milestone.approved, "Milestone already approved");
        
        // Update milestone state
        milestone.approved = true;
        milestone.approvedAt = block.timestamp;
        
        // Update contract state
        releasedAmount += milestone.amount;
        currentMilestoneIndex++;
        
        // Transition to ACTIVE if first milestone
        if (state == EscrowState.FUNDED) {
            state = EscrowState.ACTIVE;
        }
        
        // Check if all milestones completed
        if (currentMilestoneIndex == milestones.length) {
            state = EscrowState.COMPLETED;
            emit EscrowCompleted(releasedAmount, block.timestamp);
        }
        
        // Transfer payment to freelancer (external call last - CEI pattern)
        (bool success, ) = payable(freelancer).call{value: milestone.amount}("");
        require(success, "Payment transfer failed");
        
        emit MilestoneApproved(_milestoneIndex, milestone.amount, freelancer, block.timestamp);
    }
    
    /**
     * @notice Client reclaims remaining funds after project deadline
     * @dev Only available if refundEnabled is true
     */
    function refundAfterTimeout() 
        external 
        onlyClient 
        afterDeadline 
        nonReentrant 
    {
        require(refundEnabled, "Refunds not enabled");
        require(
            state == EscrowState.FUNDED || state == EscrowState.ACTIVE,
            "Cannot refund in current state"
        );
        
        // Calculate refundable amount
        uint256 refundAmount = totalAmount - releasedAmount;
        require(refundAmount > 0, "No funds to refund");
        
        // Update state
        state = EscrowState.REFUNDED;
        
        // Transfer refund to client (external call last - CEI pattern)
        (bool success, ) = payable(client).call{value: refundAmount}("");
        require(success, "Refund transfer failed");
        
        emit EscrowRefunded(client, refundAmount, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get milestone details
     * @param _index Index of the milestone
     * @return Milestone struct
     */
    function getMilestone(uint256 _index) external view returns (Milestone memory) {
        require(_index < milestones.length, "Invalid milestone index");
        return milestones[_index];
    }
    
    /**
     * @notice Get total number of milestones
     * @return Number of milestones
     */
    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }
    
    /**
     * @notice Get remaining balance in escrow
     * @return Remaining amount in wei
     */
    function getRemainingBalance() external view returns (uint256) {
        return totalAmount - releasedAmount;
    }
    
    /**
     * @notice Get all milestone descriptions and amounts
     * @return descriptions Array of milestone descriptions
     * @return amounts Array of milestone amounts
     * @return approved Array of approval statuses
     */
    function getAllMilestones() 
        external 
        view 
        returns (
            string[] memory descriptions,
            uint256[] memory amounts,
            bool[] memory approved
        ) 
    {
        uint256 length = milestones.length;
        descriptions = new string[](length);
        amounts = new uint256[](length);
        approved = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            descriptions[i] = milestones[i].description;
            amounts[i] = milestones[i].amount;
            approved[i] = milestones[i].approved;
        }
        
        return (descriptions, amounts, approved);
    }
}
