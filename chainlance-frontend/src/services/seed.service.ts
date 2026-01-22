import { API_BASE_URL } from "../config/api";

export const SeedService = {
    async seedDatabase(): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/debug/seed`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Seeding failed');
        const data = await response.json();
        console.log("Seeding result:", data);
        return;
    }
};
