const hre = require("hardhat");

async function main() {
    console.log("Deploying MilestoneEscrow contract...\n");

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Configuration - MODIFY THESE VALUES
    const FREELANCER_ADDRESS = "0x0000000000000000000000000000000000000000"; // Replace with actual freelancer address

    const milestoneDescriptions = [
        "Design and wireframes",
        "Frontend development",
        "Backend API",
        "Testing and deployment"
    ];

    const milestoneAmounts = [
        hre.ethers.parseEther("0.5"),
        hre.ethers.parseEther("1.0"),
        hre.ethers.parseEther("0.75"),
        hre.ethers.parseEther("0.25")
    ];

    // 30 days from now
    const projectDeadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    const refundEnabled = true;

    // Validate configuration
    if (FREELANCER_ADDRESS === "0x0000000000000000000000000000000000000000") {
        console.error("❌ Error: Please set a valid FREELANCER_ADDRESS in the deployment script");
        process.exit(1);
    }

    const totalAmount = milestoneAmounts.reduce((a, b) => a + b, 0n);
    console.log("Configuration:");
    console.log("  Freelancer:", FREELANCER_ADDRESS);
    console.log("  Total milestones:", milestoneDescriptions.length);
    console.log("  Total amount:", hre.ethers.formatEther(totalAmount), "ETH");
    console.log("  Project deadline:", new Date(projectDeadline * 1000).toISOString());
    console.log("  Refund enabled:", refundEnabled);
    console.log("");

    // Deploy contract
    const MilestoneEscrow = await hre.ethers.getContractFactory("MilestoneEscrow");
    const escrow = await MilestoneEscrow.deploy(
        FREELANCER_ADDRESS,
        milestoneDescriptions,
        milestoneAmounts,
        projectDeadline,
        refundEnabled
    );

    await escrow.waitForDeployment();
    const contractAddress = await escrow.getAddress();

    console.log("✅ MilestoneEscrow deployed to:", contractAddress);
    console.log("");

    // Display milestone details
    console.log("Milestones:");
    for (let i = 0; i < milestoneDescriptions.length; i++) {
        console.log(`  ${i + 1}. ${milestoneDescriptions[i]} - ${hre.ethers.formatEther(milestoneAmounts[i])} ETH`);
    }
    console.log("");

    // Next steps
    console.log("Next steps:");
    console.log(`  1. Fund the escrow: escrow.fundEscrow({ value: "${hre.ethers.formatEther(totalAmount)}" })`);
    console.log("  2. Approve milestones: escrow.approveMilestone(0)");
    console.log("");
    console.log("Verification command:");
    console.log(`  npx hardhat verify --network sepolia ${contractAddress} "${FREELANCER_ADDRESS}" '${JSON.stringify(milestoneDescriptions)}' '${JSON.stringify(milestoneAmounts.map(a => a.toString()))}' ${projectDeadline} ${refundEnabled}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
