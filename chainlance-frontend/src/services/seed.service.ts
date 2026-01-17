export const SeedService = {
    async seedDatabase(): Promise<void> {
        console.log("Database already seeded via backend CLI.");
        return Promise.resolve();
    }
};
