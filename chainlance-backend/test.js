const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

try {
    const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
    const prisma = new PrismaClient({ adapter });
    console.log('PrismaClient initialized successfully with adapter');
    prisma.user.findMany().then(u => {
        console.log('Users:', u.length);
        process.exit(0);
    }).catch(err => {
        console.error('Query failed:', err.message);
        process.exit(1);
    });
} catch (e) {
    console.error('Initialization failed:', e.message);
    process.exit(1);
}
