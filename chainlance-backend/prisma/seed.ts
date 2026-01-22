import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting simplified seed...');

    // CLEAN DATA
    try {
        await (prisma as any).escrowTransaction.deleteMany(); console.log('1. EscrowTransaction cleared');
        await prisma.dispute.deleteMany(); console.log('2. Dispute cleared');
        await prisma.message.deleteMany(); console.log('3. Message cleared');
        await prisma.milestone.deleteMany(); console.log('4. Milestone cleared');
        await prisma.project.deleteMany(); console.log('5. Project cleared');
        await prisma.proposal.deleteMany(); console.log('6. Proposal cleared');
        await prisma.job.deleteMany(); console.log('7. Job cleared');
        await prisma.user.deleteMany(); console.log('8. User cleared');
        console.log('🗑️ Database cleared');
    } catch (e) {
        console.error('❌ Database clearing failed at some step:', (e as any).message);
        throw e;
    }

    // Users
    console.log('👤 Seeding Alice...');
    const alice = await prisma.user.create({
        data: {
            walletAddress: '0x1234567890123456789012345678901234567890',
            displayName: 'Alice (Client)',
            role: 'client' as any,
            bio: 'Startup founder.',
        }
    });

    console.log('👤 Seeding Bob...');
    const bob = await prisma.user.create({
        data: {
            walletAddress: '0x2345678901234567890123456789012345678901',
            displayName: 'Bob (Freelancer)',
            role: 'freelancer' as any,
            bio: 'Senior Engineer.',
            skills: JSON.stringify(['React', 'Solidity']) as any,
        }
    });

    console.log('✅ Users seeded');

    // Jobs
    await prisma.job.create({
        data: {
            clientId: alice.id,
            title: 'Build Decentralized Dashboard',
            description: 'Looking for a dev to build a real-time DeFi dashboard.',
            budget: '1500',
            status: 'open' as any,
            requiredSkills: JSON.stringify(['React', 'Web3.js']) as any,
        }
    });

    await prisma.job.create({
        data: {
            clientId: alice.id,
            title: 'Smart Contract Security Audit',
            description: 'Audit our new lending protocol for potential vulnerabilities.',
            budget: '2400',
            status: 'open' as any,
            requiredSkills: JSON.stringify(['Solidity', 'Security']) as any,
        }
    });

    await prisma.job.create({
        data: {
            clientId: bob.id, // Bob as client
            title: 'Frontend Component Library',
            description: 'Need a set of reusable Tailwind components for a freelancer platform.',
            budget: '800',
            status: 'open' as any,
        }
    });

    await prisma.job.create({
        data: {
            clientId: alice.id,
            title: 'Post-Quantum Encryption Research',
            description: 'Experimental research job.',
            budget: '5000',
            status: 'open' as any,
        }
    });

    console.log('✅ Jobs seeded');

    // Disputed Project
    const disputedJob = await prisma.job.create({
        data: {
            clientId: alice.id,
            title: 'Complex Lending Protocol',
            description: 'High stakes development.',
            budget: '5000',
            status: 'in_progress' as any,
        }
    });

    const proposal = await prisma.proposal.create({
        data: {
            jobId: disputedJob.id,
            freelancerId: bob.id,
            coverLetter: 'Expert auditor.',
            proposedAmount: '5000',
            status: 'accepted' as any,
        }
    });

    const project = await prisma.project.create({
        data: {
            jobId: disputedJob.id,
            proposalId: proposal.id,
            clientId: alice.id,
            freelancerId: bob.id,
            totalAmount: '5000',
            status: 'disputed' as any,
        }
    });

    const milestone = await prisma.milestone.create({
        data: {
            projectId: project.id,
            title: 'Core Engine Development',
            description: 'The main logic.',
            amount: '5000',
            status: 'disputed' as any,
        }
    });

    await prisma.dispute.create({
        data: {
            milestoneId: milestone.id,
            raisedBy: alice.id,
            reason: 'Delays and quality issues.',
            status: 'open' as any,
        }
    });

    // Completed Project
    console.log('📦 Seeding Completed Project...');
    const compJob = await prisma.job.create({
        data: {
            clientId: alice.id,
            title: 'Landing Page SEO',
            description: 'Optimize our landing page.',
            budget: '300',
            status: 'completed' as any,
        }
    });

    const compProp = await prisma.proposal.create({
        data: {
            jobId: compJob.id,
            freelancerId: bob.id,
            coverLetter: 'I am an SEO expert.',
            proposedAmount: '300',
            status: 'accepted' as any,
        }
    });

    const compProj = await prisma.project.create({
        data: {
            jobId: compJob.id,
            proposalId: compProp.id,
            clientId: alice.id,
            freelancerId: bob.id,
            totalAmount: '300',
            status: 'completed' as any,
            completedAt: new Date(),
        }
    });
    console.log('✅ Project created:', compProj.id);

    console.log('📦 Seeding Milestone for Completed Project...');
    await prisma.milestone.create({
        data: {
            projectId: compProj.id,
            title: 'Technical SEO Audit',
            description: 'Full audit.',
            amount: '300',
            status: 'paid' as any,
        }
    });

    console.log('✅ Disputes and Completed projects seeded');
    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        if (e.code) console.error('❌ Prisma Error Code:', e.code);
        if (e.meta) console.error('❌ Prisma Error Meta:', e.meta);
        console.error('❌ Full Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
