import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

console.log('DATABASE_URL:', process.env.DATABASE_URL);

// Try initialization
try {
    const prisma = new PrismaClient();
    console.log('PrismaClient initialized successfully with no args');
} catch (e: any) {
    console.error('Failed to initialize with no args:', e.message);
}

try {
    const prisma = new PrismaClient({
        datasource: {
            url: process.env.DATABASE_URL
        }
    } as any);
    console.log('PrismaClient initialized successfully with datasource arg');
} catch (e: any) {
    console.error('Failed to initialize with datasource arg:', e.message);
}

try {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    } as any);
    console.log('PrismaClient initialized successfully with datasources.db arg');
} catch (e: any) {
    console.error('Failed to initialize with datasources.db arg:', e.message);
}
