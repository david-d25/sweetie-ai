import {VK} from "vk-io";

export type VkUser = {
    id: number,
    firstName: string,
    lastName: string
}

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

    async getUsers(ids: number[]): Promise<Map<number, VkUser>> {
        const users: Map<number, VkUser> = new Map();
        const idsToFetch: number[] = [];

        for (const id of ids) {
            const cachedUser = this.cache.get(id);
            if (cachedUser) {
                users.set(id, cachedUser.user);
            } else {
                if (id > 0)
                    idsToFetch.push(id);
                else if (id == 0)
                    users.set(id, {id, firstName: "(me)", lastName: ""});
                else
                    users.set(id, {id, firstName: "__vk_group__", lastName: ""});
            }
        }

        if (idsToFetch.length > 0) {
            const response = await this.vk.api.users.get({
                user_ids: idsToFetch,
                fields: ["first_name_nom", "last_name_nom"],
            });
            for (const responseItem of response) {
                const id = responseItem.id;
                const user = {id, firstName: responseItem.first_name_nom, lastName: responseItem.last_name_nom};
                users.set(id, user);
                const timer = setTimeout(() => { this.cache.delete(id) }, CACHE_TTL);
                this.cache.set(id, { user, timer });
            }
        }

        return users;
    }

    private async fetchUser(id: number): Promise<VkUser> {
        if (id > 0) {
            const response = await this.vk.api.users.get({
                user_ids: [id],
                fields: ["first_name_nom", "last_name_nom"],
            });

            return { id, firstName: response[0].first_name_nom, lastName: response[0].last_name_nom};
        } else if (id == 0) { // This bot
            return { id, firstName: "(me)", lastName: ""};
        } else { // Group, not user
            return { id, firstName: "__vk_group__", lastName: ""};
        }
    }
}