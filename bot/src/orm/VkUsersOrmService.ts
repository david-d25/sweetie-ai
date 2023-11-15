import {Client} from "pg";
import {Context} from "../Context";
import {VkUser} from "../service/VkUsersService";

export class VkUsersOrmService {
    private client!: Client;

    constructor(private context: Context) {
        context.onReady(this.start.bind(this));
    }

    async start() {
        this.client = this.context.postgresClient!;
        const q = this.client.query.bind(this.client);
        await q(`
            create table if not exists vk_users (
                id bigint primary key,
                first_name text default null,
                last_name text default null,
                credits bigint default 0,
                last_credit_gain timestamp default current_timestamp,
                usage_plan_id varchar default null references usage_plans on delete set default on update cascade,
                usage_plan_expiry timestamp default null
            );
        `);
        await q(`
            create index if not exists vk_users__credits on vk_users(credits);
        `);
    }

    async getUser(id: number): Promise<VkUser | null> {
        const q = this.client.query.bind(this.client);
        const result = await q(`select * from vk_users where id = $1`, [id]);
        if (result.rowCount == 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            firstNameCached: row.first_name,
            lastNameCached: row.last_name,
            credits: +row.credits,
            lastCreditGain: row.last_credit_gain,
            usagePlanId: row.usage_plan_id,
            usagePlanExpiry: row.usage_plan_expiry
        };
    }

    async saveUser(user: VkUser) {
        const q = this.client.query.bind(this.client);
        await q(`
            insert into vk_users (
                id, first_name, last_name, credits, last_credit_gain, usage_plan_id, usage_plan_expiry
            )
            values ($1, $2, $3, $4, $5, $6, $7)
            on conflict (id) do update set
                first_name = $2,
                last_name = $3,
                credits = $4,
                last_credit_gain = $5,
                usage_plan_id = $6,
                usage_plan_expiry = $7;
        `, [
            user.id,
            user.firstNameCached,
            user.lastNameCached,
            user.credits,
            user.lastCreditGain,
            user.usagePlanId,
            user.usagePlanExpiry
        ]);
    }

    async setUserFirstNameAndLastName(id: number, firstName: string, lastName: string) {
        const q = this.client.query.bind(this.client);
        await q(`
            update vk_users set
                first_name = $2,
                last_name = $3
            where id = $1;
        `, [id, firstName, lastName]);
    }

    async setUserUsagePlanWhereExpiryIsBefore(usagePlanId: string | null, date: Date) {
        const q = this.client.query.bind(this.client);
        await q(`
            update vk_users set
                usage_plan_id = $1,
                usage_plan_expiry = null
            where usage_plan_expiry < $2;
        `, [usagePlanId, date]);
    }

    async addCredits(id: number, amount: number) {
        const q = this.client.query.bind(this.client);
        await q(`
            update vk_users set
                credits = credits + $2
            where id = $1;
        `, [id, amount]);
    }

    async setUserUsagePlan(id: number, usagePlanId: string | null, expiry: Date | null) {
        const q = this.client.query.bind(this.client);
        await q(`
            update vk_users set
                usage_plan_id = $2,
                usage_plan_expiry = $3
            where id = $1;
        `, [id, usagePlanId, expiry]);
    }

    async getUsersWithCreditsLessThanMax(): Promise<VkUser[]> {
        const q = this.client.query.bind(this.client);
        const result = await q(`
            select vk_users.id as id, first_name, last_name, credits, last_credit_gain, usage_plan_id, usage_plan_expiry
            from vk_users left join usage_plans on coalesce(vk_users.usage_plan_id, 'default') = usage_plans.id
            where vk_users.credits < usage_plans.max_credits;
        `);
        return result.rows.map(row => ({
            id: row.id,
            firstNameCached: row.first_name,
            lastNameCached: row.last_name,
            credits: +row.credits,
            lastCreditGain: row.last_credit_gain,
            usagePlanId: row.usage_plan_id,
            usagePlanExpiry: row.usage_plan_expiry
        }));
    }

    async refreshLastCreditGainWhenMaxCredits(date: Date) {
        await this.client.query(`
            update vk_users set last_credit_gain = $1
            from usage_plans
            where coalesce(vk_users.usage_plan_id, 'default') = usage_plans.id and
                  vk_users.credits >= usage_plans.max_credits;
        `, [
            date
        ]);
    }
}