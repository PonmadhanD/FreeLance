import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Starting seed...');

    // Create sample users
    const alice = await prisma.user.upsert({
        where: { walletAddress: '0x1234567890123456789012345678901234567890' },
        update: {},
        create: {
            walletAddress: '0x1234567890123456789012345678901234567890',
            email: 'alice@example.com',
            displayName: 'Alice Johnson',
            role: 'client',
            bio: 'Startup founder looking for quality developers',
            skills: JSON.stringify([]),
        },
    });

    const bob = await prisma.user.upsert({
        where: { walletAddress: '0x2345678901234567890123456789012345678901' },
        update: {},
        create: {
            walletAddress: '0x2345678901234567890123456789012345678901',
            email: 'bob@example.com',
            displayName: 'Bob Smith',
            role: 'freelancer',
            bio: 'Full-stack developer with 5 years experience',
            skills: JSON.stringify(['React', 'Node.js', 'Solidity', 'PostgreSQL']),
        },
    });

    const carol = await prisma.user.upsert({
        where: { walletAddress: '0x3456789012345678901234567890123456789012' },
        update: {},
        create: {
            walletAddress: '0x3456789012345678901234567890123456789012',
            email: 'carol@example.com',
            displayName: 'Carol Lee',
            role: 'both',
            bio: 'Designer and occasional client',
            skills: JSON.stringify(['UI/UX', 'Figma', 'React']),
        },
    });

    const devMaster = await prisma.user.upsert({
        where: { walletAddress: '0x4567890123456789012345678901234567890123' },
        update: {},
        create: {
            walletAddress: '0x4567890123456789012345678901234567890123',
            displayName: 'Dev Master',
            role: 'freelancer',
            bio: 'Smart contract specialist',
            skills: JSON.stringify(['Solidity', 'Web3', 'Hardhat']),
        },
    });

    console.log('✅ Created users:', { alice, bob, carol, devMaster });

    // Create sample jobs
    const job1 = await prisma.job.create({
        data: {
            clientId: alice.id,
            title: 'Build React Dashboard',
            description: 'Need a modern admin dashboard with charts and analytics. Must be responsive and follow Material Design guidelines.',
            budget: 2.5,
            status: 'open',
            requiredSkills: JSON.stringify(['React', 'TypeScript', 'TailwindCSS']),
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
    });

    const job2 = await prisma.job.create({
        data: {
            clientId: alice.id,
            title: 'Smart Contract Audit',
            description: 'Security audit for ERC20 token contract. Need comprehensive report with vulnerabilities and recommendations.',
            budget: 5.0,
            status: 'open',
            requiredSkills: JSON.stringify(['Solidity', 'Security']),
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        },
    });

    const job3 = await prisma.job.create({
        data: {
            clientId: carol.id,
            title: 'Landing Page Design',
            description: 'Modern landing page for SaaS product. Looking for clean, professional design.',
            budget: 1.2,
            status: 'open',
            requiredSkills: JSON.stringify(['Figma', 'UI/UX']),
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        },
    });

    console.log('✅ Created jobs:', { job1, job2, job3 });

    // Create sample proposals
    const proposal1 = await prisma.proposal.create({
        data: {
            jobId: job1.id,
            freelancerId: bob.id,
            coverLetter:
                'I have built 10+ React dashboards with similar requirements. My expertise includes TypeScript, Material UI, and Chart.js. I can deliver a pixel-perfect, responsive dashboard in 3 weeks. Portfolio: example.com/portfolio',
            proposedAmount: 2.3,
            estimatedDuration: 21,
            status: 'pending',
        },
    });

    const proposal2 = await prisma.proposal.create({
        data: {
            jobId: job2.id,
            freelancerId: devMaster.id,
            coverLetter:
                'Certified smart contract auditor with 50+ audits completed. I specialize in ERC20 tokens and have discovered critical vulnerabilities in production contracts. I use Slither, Mythril, and manual code review for comprehensive analysis.',
            proposedAmount: 4.8,
            estimatedDuration: 10,
            status: 'pending',
        },
    });

    const proposal3 = await prisma.proposal.create({
        data: {
            jobId: job1.id,
            freelancerId: carol.id,
            coverLetter:
                'I can help with the UI/UX design and React implementation. I have experience building dashboards for analytics platforms. I focus on user experience and accessibility.',
            proposedAmount: 2.4,
            estimatedDuration: 25,
            status: 'pending',
        },
    });

    console.log('✅ Created proposals:', { proposal1, proposal2, proposal3 });

    // Accept proposal2 and create a project
    await prisma.proposal.update({
        where: { id: proposal2.id },
        data: { status: 'accepted' },
    });

    await prisma.job.update({
        where: { id: job2.id },
        data: { status: 'in_progress' },
    });

    const project1 = await prisma.project.create({
        data: {
            jobId: job2.id,
            proposalId: proposal2.id,
            clientId: alice.id,
            freelancerId: devMaster.id,
            totalAmount: 4.8,
            status: 'active',
        },
    });

    console.log('✅ Created project:', project1);

    // Create milestones
    const milestone1 = await prisma.milestone.create({
        data: {
            projectId: project1.id,
            title: 'Initial Security Review',
            description: 'Review contract code and identify potential vulnerabilities using automated tools and manual analysis',
            amount: 1.6,
            status: 'pending',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        },
    });

    const milestone2 = await prisma.milestone.create({
        data: {
            projectId: project1.id,
            title: 'Detailed Audit Report',
            description: 'Comprehensive audit report with vulnerability classifications, severity ratings, and detailed recommendations',
            amount: 2.0,
            status: 'pending',
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        },
    });

    const milestone3 = await prisma.milestone.create({
        data: {
            projectId: project1.id,
            title: 'Final Verification',
            description: 'Verify all fixes have been properly implemented and provide final security clearance',
            amount: 1.2,
            status: 'pending',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        },
    });

    console.log('✅ Created milestones:', { milestone1, milestone2, milestone3 });

    // Fund milestone1 (simulate)
    await prisma.milestone.update({
        where: { id: milestone1.id },
        data: {
            escrowContractAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            status: 'funded',
        },
    });

    const transaction1 = await prisma.escrowTransaction.create({
        data: {
            milestoneId: milestone1.id,
            transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            eventType: 'funded',
            fromAddress: alice.walletAddress,
            amount: 1.6,
            blockNumber: 12345678n,
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
    });

    console.log('✅ Created escrow transaction:', transaction1);

    // Create sample messages
    const message1 = await prisma.message.create({
        data: {
            projectId: project1.id,
            senderId: alice.id,
            content: 'Hi! Looking forward to working with you on this audit. Please let me know if you need any additional information about the contract.',
            readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
    });

    const message2 = await prisma.message.create({
        data: {
            projectId: project1.id,
            senderId: devMaster.id,
            content: 'Thanks! I have started the initial review. Will update you by end of day with preliminary findings.',
            readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
    });

    const message3 = await prisma.message.create({
        data: {
            projectId: project1.id,
            senderId: devMaster.id,
            content: 'Found a few potential issues in the transfer function. Can we schedule a call to discuss the findings in detail?',
        },
    });

    console.log('✅ Created messages:', { message1, message2, message3 });

    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
