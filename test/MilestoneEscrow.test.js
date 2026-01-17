const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MilestoneEscrow", function () {
    // ============ Fixtures ============

    async function deployEscrowFixture() {
        const [client, freelancer, otherAccount] = await ethers.getSigners();

        const descriptions = [
            "Design mockups and wireframes",
            "Frontend implementation",
            "Backend API development",
            "Testing and deployment"
        ];

        const amounts = [
            ethers.parseEther("1.0"),
            ethers.parseEther("2.0"),
            ethers.parseEther("1.5"),
            ethers.parseEther("0.5")
        ];

        const totalAmount = amounts.reduce((a, b) => a + b, 0n);
        const projectDeadline = (await time.latest()) + 86400 * 30; // 30 days
        const refundEnabled = true;

        const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");
        const escrow = await MilestoneEscrow.deploy(
            freelancer.address,
            descriptions,
            amounts,
            projectDeadline,
            refundEnabled
        );

        return {
            escrow,
            client,
            freelancer,
            otherAccount,
            descriptions,
            amounts,
            totalAmount,
            projectDeadline,
            refundEnabled
        };
    }

    async function deployFundedEscrowFixture() {
        const fixture = await deployEscrowFixture();
        await fixture.escrow.connect(fixture.client).fundEscrow({ value: fixture.totalAmount });
        return fixture;
    }

    // ============ Constructor Tests ============

    describe("Constructor", function () {
        it("Should set the correct client and freelancer", async function () {
            const { escrow, client, freelancer } = await loadFixture(deployEscrowFixture);
            expect(await escrow.client()).to.equal(client.address);
            expect(await escrow.freelancer()).to.equal(freelancer.address);
        });

        it("Should calculate total amount correctly", async function () {
            const { escrow, totalAmount } = await loadFixture(deployEscrowFixture);
            expect(await escrow.totalAmount()).to.equal(totalAmount);
        });

        it("Should initialize in CREATED state", async function () {
            const { escrow } = await loadFixture(deployEscrowFixture);
            expect(await escrow.state()).to.equal(0); // EscrowState.CREATED
        });

        it("Should store all milestones correctly", async function () {
            const { escrow, descriptions, amounts } = await loadFixture(deployEscrowFixture);
            expect(await escrow.getMilestoneCount()).to.equal(descriptions.length);

            for (let i = 0; i < descriptions.length; i++) {
                const milestone = await escrow.getMilestone(i);
                expect(milestone.description).to.equal(descriptions[i]);
                expect(milestone.amount).to.equal(amounts[i]);
                expect(milestone.approved).to.be.false;
                expect(milestone.approvedAt).to.equal(0);
            }
        });

        it("Should deploy with correct initial parameters", async function () {
            const [client, freelancer] = await ethers.getSigners();
            const descriptions = ["Milestone 1"];
            const amounts = [ethers.parseEther("1.0")];
            const deadline = (await time.latest()) + 86400;

            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");
            const escrow = await MilestoneEscrow.deploy(freelancer.address, descriptions, amounts, deadline, true);

            expect(await escrow.client()).to.equal(client.address);
            expect(await escrow.freelancer()).to.equal(freelancer.address);
            expect(await escrow.totalAmount()).to.equal(amounts[0]);
            expect(await escrow.getMilestoneCount()).to.equal(1);
        });

        it("Should revert if freelancer address is zero", async function () {
            const [client] = await ethers.getSigners();
            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

            await expect(
                MilestoneEscrow.deploy(
                    ethers.ZeroAddress,
                    ["Milestone"],
                    [ethers.parseEther("1")],
                    (await time.latest()) + 86400,
                    true
                )
            ).to.be.revertedWith("Invalid freelancer address");
        });

        it("Should revert if arrays have different lengths", async function () {
            const [client, freelancer] = await ethers.getSigners();
            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

            await expect(
                MilestoneEscrow.deploy(
                    freelancer.address,
                    ["Milestone 1", "Milestone 2"],
                    [ethers.parseEther("1")],
                    (await time.latest()) + 86400,
                    true
                )
            ).to.be.revertedWith("Array length mismatch");
        });

        it("Should revert if no milestones provided", async function () {
            const [client, freelancer] = await ethers.getSigners();
            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

            await expect(
                MilestoneEscrow.deploy(
                    freelancer.address,
                    [],
                    [],
                    (await time.latest()) + 86400,
                    true
                )
            ).to.be.revertedWith("Must have at least one milestone");
        });

        it("Should revert if milestone amount is zero", async function () {
            const [client, freelancer] = await ethers.getSigners();
            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

            await expect(
                MilestoneEscrow.deploy(
                    freelancer.address,
                    ["Milestone"],
                    [0],
                    (await time.latest()) + 86400,
                    true
                )
            ).to.be.revertedWith("Milestone amount must be > 0");
        });

        it("Should revert if deadline is in the past when refunds enabled", async function () {
            const [client, freelancer] = await ethers.getSigners();
            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

            await expect(
                MilestoneEscrow.deploy(
                    freelancer.address,
                    ["Milestone"],
                    [ethers.parseEther("1")],
                    (await time.latest()) - 1,
                    true
                )
            ).to.be.revertedWith("Deadline must be in future");
        });
    });

    // ============ Fund Escrow Tests ============

    describe("Fund Escrow", function () {
        it("Should allow client to fund with exact amount", async function () {
            const { escrow, client, totalAmount } = await loadFixture(deployEscrowFixture);

            await expect(escrow.connect(client).fundEscrow({ value: totalAmount }))
                .to.changeEtherBalances([client, escrow], [-totalAmount, totalAmount]);

            expect(await escrow.state()).to.equal(1); // EscrowState.FUNDED
        });

        it("Should emit EscrowFunded event", async function () {
            const { escrow, client, totalAmount } = await loadFixture(deployEscrowFixture);

            await expect(escrow.connect(client).fundEscrow({ value: totalAmount }))
                .to.emit(escrow, "EscrowFunded")
                .withArgs(client.address, totalAmount, await time.latest() + 1);
        });

        it("Should revert if non-client tries to fund", async function () {
            const { escrow, freelancer, totalAmount } = await loadFixture(deployEscrowFixture);

            await expect(
                escrow.connect(freelancer).fundEscrow({ value: totalAmount })
            ).to.be.revertedWith("Only client can call this");
        });

        it("Should revert if amount is incorrect", async function () {
            const { escrow, client, totalAmount } = await loadFixture(deployEscrowFixture);

            await expect(
                escrow.connect(client).fundEscrow({ value: totalAmount - 1n })
            ).to.be.revertedWith("Must send exact total amount");
        });

        it("Should revert if already funded", async function () {
            const { escrow, client, totalAmount } = await loadFixture(deployFundedEscrowFixture);

            await expect(
                escrow.connect(client).fundEscrow({ value: totalAmount })
            ).to.be.revertedWith("Invalid state for this operation");
        });
    });

    // ============ Approve Milestone Tests ============

    describe("Approve Milestone", function () {
        it("Should approve first milestone and release payment", async function () {
            const { escrow, client, freelancer, amounts } = await loadFixture(deployFundedEscrowFixture);

            await expect(escrow.connect(client).approveMilestone(0))
                .to.changeEtherBalances([escrow, freelancer], [-amounts[0], amounts[0]]);

            const milestone = await escrow.getMilestone(0);
            expect(milestone.approved).to.be.true;
            expect(milestone.approvedAt).to.be.greaterThan(0);
            expect(await escrow.releasedAmount()).to.equal(amounts[0]);
            expect(await escrow.currentMilestoneIndex()).to.equal(1);
            expect(await escrow.state()).to.equal(2); // EscrowState.ACTIVE
        });

        it("Should emit MilestoneApproved event", async function () {
            const { escrow, client, freelancer, amounts } = await loadFixture(deployFundedEscrowFixture);

            await expect(escrow.connect(client).approveMilestone(0))
                .to.emit(escrow, "MilestoneApproved")
                .withArgs(0, amounts[0], freelancer.address, await time.latest() + 1);
        });

        it("Should approve multiple milestones sequentially", async function () {
            const { escrow, client, amounts } = await loadFixture(deployFundedEscrowFixture);

            for (let i = 0; i < amounts.length; i++) {
                await escrow.connect(client).approveMilestone(i);
                expect(await escrow.currentMilestoneIndex()).to.equal(i + 1);
            }
        });

        it("Should transition to COMPLETED after last milestone", async function () {
            const { escrow, client, amounts, totalAmount } = await loadFixture(deployFundedEscrowFixture);

            for (let i = 0; i < amounts.length - 1; i++) {
                await escrow.connect(client).approveMilestone(i);
            }

            await expect(escrow.connect(client).approveMilestone(amounts.length - 1))
                .to.emit(escrow, "EscrowCompleted")
                .withArgs(totalAmount, await time.latest() + 1);

            expect(await escrow.state()).to.equal(3); // EscrowState.COMPLETED
            expect(await escrow.releasedAmount()).to.equal(totalAmount);
        });

        it("Should revert if non-client tries to approve", async function () {
            const { escrow, freelancer } = await loadFixture(deployFundedEscrowFixture);

            await expect(
                escrow.connect(freelancer).approveMilestone(0)
            ).to.be.revertedWith("Only client can call this");
        });

        it("Should revert if trying to skip milestones", async function () {
            const { escrow, client } = await loadFixture(deployFundedEscrowFixture);

            await expect(
                escrow.connect(client).approveMilestone(1)
            ).to.be.revertedWith("Must approve sequentially");
        });

        it("Should revert if milestone already approved", async function () {
            const { escrow, client } = await loadFixture(deployFundedEscrowFixture);

            await escrow.connect(client).approveMilestone(0);

            await expect(
                escrow.connect(client).approveMilestone(0)
            ).to.be.revertedWith("Must approve sequentially");
        });

        it("Should revert if invalid milestone index", async function () {
            const { escrow, client, amounts } = await loadFixture(deployFundedEscrowFixture);

            await expect(
                escrow.connect(client).approveMilestone(amounts.length)
            ).to.be.revertedWith("Invalid milestone index");
        });

        it("Should revert if escrow not funded", async function () {
            const { escrow, client } = await loadFixture(deployEscrowFixture);

            await expect(
                escrow.connect(client).approveMilestone(0)
            ).to.be.revertedWith("Escrow not active");
        });
    });

    // ============ Refund After Timeout Tests ============

    describe("Refund After Timeout", function () {
        it("Should allow client to refund after deadline", async function () {
            const { escrow, client, totalAmount, projectDeadline } = await loadFixture(deployFundedEscrowFixture);

            await time.increaseTo(projectDeadline + 1);

            await expect(escrow.connect(client).refundAfterTimeout())
                .to.changeEtherBalances([escrow, client], [-totalAmount, totalAmount]);

            expect(await escrow.state()).to.equal(4); // EscrowState.REFUNDED
        });

        it("Should emit EscrowRefunded event", async function () {
            const { escrow, client, totalAmount, projectDeadline } = await loadFixture(deployFundedEscrowFixture);

            await time.increaseTo(projectDeadline + 1);

            await expect(escrow.connect(client).refundAfterTimeout())
                .to.emit(escrow, "EscrowRefunded")
                .withArgs(client.address, totalAmount, await time.latest() + 1);
        });

        it("Should refund only remaining amount if some milestones approved", async function () {
            const { escrow, client, amounts, totalAmount, projectDeadline } = await loadFixture(deployFundedEscrowFixture);

            // Approve first 2 milestones
            await escrow.connect(client).approveMilestone(0);
            await escrow.connect(client).approveMilestone(1);

            const releasedAmount = amounts[0] + amounts[1];
            const remainingAmount = totalAmount - releasedAmount;

            await time.increaseTo(projectDeadline + 1);

            await expect(escrow.connect(client).refundAfterTimeout())
                .to.changeEtherBalances([escrow, client], [-remainingAmount, remainingAmount]);
        });

        it("Should revert if non-client tries to refund", async function () {
            const { escrow, freelancer, projectDeadline } = await loadFixture(deployFundedEscrowFixture);

            await time.increaseTo(projectDeadline + 1);

            await expect(
                escrow.connect(freelancer).refundAfterTimeout()
            ).to.be.revertedWith("Only client can call this");
        });

        it("Should revert if deadline not reached", async function () {
            const { escrow, client } = await loadFixture(deployFundedEscrowFixture);

            await expect(
                escrow.connect(client).refundAfterTimeout()
            ).to.be.revertedWith("Deadline not reached");
        });

        it("Should revert if refunds not enabled", async function () {
            const [client, freelancer] = await ethers.getSigners();
            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

            const escrow = await MilestoneEscrow.deploy(
                freelancer.address,
                ["Milestone"],
                [ethers.parseEther("1")],
                0, // No deadline
                false // Refunds disabled
            );

            await escrow.fundEscrow({ value: ethers.parseEther("1") });

            await expect(
                escrow.refundAfterTimeout()
            ).to.be.revertedWith("Refunds not enabled");
        });

        it("Should revert if already completed", async function () {
            const { escrow, client, amounts, projectDeadline } = await loadFixture(deployFundedEscrowFixture);

            // Complete all milestones
            for (let i = 0; i < amounts.length; i++) {
                await escrow.connect(client).approveMilestone(i);
            }

            await time.increaseTo(projectDeadline + 1);

            await expect(
                escrow.connect(client).refundAfterTimeout()
            ).to.be.revertedWith("Cannot refund in current state");
        });
    });

    // ============ View Functions Tests ============

    describe("View Functions", function () {
        it("Should return correct milestone count", async function () {
            const { escrow, amounts } = await loadFixture(deployEscrowFixture);
            expect(await escrow.getMilestoneCount()).to.equal(amounts.length);
        });

        it("Should return correct remaining balance", async function () {
            const { escrow, client, amounts, totalAmount } = await loadFixture(deployFundedEscrowFixture);

            expect(await escrow.getRemainingBalance()).to.equal(totalAmount);

            await escrow.connect(client).approveMilestone(0);
            expect(await escrow.getRemainingBalance()).to.equal(totalAmount - amounts[0]);
        });

        it("Should return all milestones data", async function () {
            const { escrow, descriptions, amounts } = await loadFixture(deployEscrowFixture);

            const [descs, amts, approved] = await escrow.getAllMilestones();

            expect(descs.length).to.equal(descriptions.length);
            expect(amts.length).to.equal(amounts.length);
            expect(approved.length).to.equal(amounts.length);

            for (let i = 0; i < descriptions.length; i++) {
                expect(descs[i]).to.equal(descriptions[i]);
                expect(amts[i]).to.equal(amounts[i]);
                expect(approved[i]).to.be.false;
            }
        });
    });

    // ============ Edge Cases ============

    describe("Edge Cases", function () {
        it("Should handle single milestone escrow", async function () {
            const [client, freelancer] = await ethers.getSigners();
            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

            const amount = ethers.parseEther("5.0");
            const escrow = await MilestoneEscrow.deploy(
                freelancer.address,
                ["Complete project"],
                [amount],
                (await time.latest()) + 86400,
                true
            );

            await escrow.fundEscrow({ value: amount });

            await expect(escrow.approveMilestone(0))
                .to.emit(escrow, "EscrowCompleted");

            expect(await escrow.state()).to.equal(3); // COMPLETED
        });

        it("Should handle large number of milestones", async function () {
            const [client, freelancer] = await ethers.getSigners();
            const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");

            const milestoneCount = 10;
            const descriptions = Array(milestoneCount).fill("Milestone");
            const amounts = Array(milestoneCount).fill(ethers.parseEther("0.1"));
            const totalAmount = ethers.parseEther("1.0");

            const escrow = await MilestoneEscrow.deploy(
                freelancer.address,
                descriptions,
                amounts,
                (await time.latest()) + 86400,
                true
            );

            await escrow.fundEscrow({ value: totalAmount });

            for (let i = 0; i < milestoneCount; i++) {
                await escrow.approveMilestone(i);
            }

            expect(await escrow.state()).to.equal(3); // COMPLETED
        });
    });
});
