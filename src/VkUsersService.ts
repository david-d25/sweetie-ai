import {VK} from "vk-io";
import {VkUser} from "./VkUser";

const CACHE_TTL = 15 * 60 * 1000;

export default class VkUsersService {
    constructor(
        private vk: VK
    ) {}

    private cache: Map<number, { user: VkUser; timer: NodeJS.Timeout }> = new Map();

    async getUser(id: number): Promise<VkUser | null> {
        const cacheEntry = this.cache.get(id);
        if (cacheEntry)
            return cacheEntry.user;

        try {
            const user = await this.fetchUser(id);
            const timer = setTimeout(() => { this.cache.delete(id) }, CACHE_TTL);
            this.cache.set(id, { user, timer });
            return user;
        } catch (error) {
            console.error('Failed to fetch user:', error);
            return null;
        }
    }

    private async fetchUser(id: number): Promise<VkUser> {
        if (id > 0) {
            const response = await this.vk.api.users.get({
                user_ids: [id],
                fields: ["first_name_nom"],
            });

            return {id, firstName: response[0].first_name_nom};
        } else if (id == 0) { // This bot
            return { id, firstName: "(me)"};
        } else { // Group, not user
            return { id, firstName: "__vk_group__"};
        }
    }
}