import {VK} from "vk-io";
import {Context} from "../Context";
import {VkUsersOrmService} from "../orm/VkUsersOrmService";
import UsagePlanService from "./UsagePlanService";

export type VkUser = {
    id: number,
    firstNameCached: string,
    lastNameCached: string,
    credits: number,
    lastCreditGain: Date,
    usagePlanId: string | null,
    usagePlanExpiry: Date | null,
}

const CACHE_TTL = 15 * 60 * 1000;

export default class VkUsersService {
    private vk!: VK;
    private orm!: VkUsersOrmService;
    private usagePlanService!: UsagePlanService;

    constructor(private context: Context) {
        context.onReady(() => {
            this.vk = this.context.vk!;
            this.orm = this.context.vkUsersOrmService;
            this.usagePlanService = this.context.usagePlanService;
        });
    }

    private apiCache: Map<number, { firstName: string; lastName: string; timer: NodeJS.Timeout }> = new Map();

    async getUser(id: number): Promise<VkUser | null> {
        const cacheEntry = this.apiCache.get(id);
        if (cacheEntry)
            return this.refreshUserData(id, cacheEntry.firstName, cacheEntry.lastName);

        try {
            const user = await this.fetchUser(id);
            const timer = setTimeout(() => { this.apiCache.delete(id) }, CACHE_TTL);
            this.apiCache.set(id, { firstName: user.firstNameCached, lastName: user.lastNameCached, timer });
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
            const cachedUser = this.apiCache.get(id);
            if (cachedUser) {
                users.set(id, await this.refreshUserData(id, cachedUser.firstName, cachedUser.lastName));
            } else {
                if (id > 0)
                    idsToFetch.push(id);
                else if (id == 0)
                    users.set(id, this.createMockUser(id, "(me)", ""));
                else
                    users.set(id, this.createMockUser(id, "__vk_group__", ""));
            }
        }

        if (idsToFetch.length > 0) {
            const response = await this.vk.api.users.get({
                user_ids: idsToFetch,
                fields: ["first_name_nom", "last_name_nom"],
            });
            for (const responseItem of response) {
                const id = responseItem.id;
                const user = await this.refreshUserData(id, responseItem.first_name_nom, responseItem.last_name_nom);
                users.set(id, user);
                const timer = setTimeout(() => { this.apiCache.delete(id) }, CACHE_TTL);
                this.apiCache.set(id, { firstName: user.firstNameCached, lastName: user.lastNameCached, timer });
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

            const firstName = response[0].first_name_nom;
            const lastName = response[0].last_name_nom;
            return this.refreshUserData(id, firstName, lastName);
        } else if (id == 0) { // This bot
            return this.createMockUser(id, "(me)", "");
        } else { // Group, not user
            return this.refreshUserData(id, "__vk_group__", "");
        }
    }

    private async refreshUserData(id: number, firstName: string, lastName: string): Promise<VkUser> {
        const user = await this.orm.getUser(id);
        if (user) {
            user.firstNameCached = firstName;
            user.lastNameCached = lastName;
            await this.orm.setUserFirstNameAndLastName(id, firstName, lastName);
            return user;
        } else {
            const usagePlan = await this.usagePlanService.getDefaultUsagePlan();
            const user = {
                id,
                firstNameCached: firstName,
                lastNameCached: lastName,
                credits: 0,
                lastCreditGain: new Date(0),
                usagePlanId: null as string | null,
                usagePlanExpiry: null as Date | null,
            }
            if (usagePlan) {
                user.credits = usagePlan.maxCredits;
            }
            await this.orm.saveUser(user);
            return user;
        }
    }

    private createMockUser(id: number, firstName: string, lastName: string): VkUser {
        return {
            id,
            firstNameCached: firstName,
            lastNameCached: lastName,
            credits: 0,
            lastCreditGain: new Date(0),
            usagePlanId: null,
            usagePlanExpiry: null,
        };
    }
}