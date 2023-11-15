import {Context} from "../Context";
import {Client} from "pg";
import {UsagePlan} from "../service/UsagePlanService";

export default class UsagePlanOrmService {
    private client!: Client;
    constructor(private context: Context) {
        context.onReady(this.start.bind(this));
    }

    async start() {
        this.client = this.context.postgresClient!;
        const q = this.client.query.bind(this.client);
        await q(`
            create table if not exists usage_plans (
                id varchar primary key,
                title text,
                max_credits bigint,
                credit_gain_amount bigint,
                credit_gain_period_seconds bigint,
                visible boolean default true
            );
        `);
    }

    async getUsagePlan(id: string): Promise<UsagePlan | null> {
        const q = this.client.query.bind(this.client);
        const result = await q(`select * from usage_plans where id = $1`, [id]);
        if (result.rowCount == 0)
            return null;
        const row = result.rows[0];
        return {
            id: row.id,
            title: row.title,
            maxCredits: row.max_credits,
            creditGainAmount: row.credit_gain_amount,
            creditGainPeriodSeconds: row.credit_gain_period_seconds,
            visible: row.visible
        };
    }

    async getUsagePlans(): Promise<UsagePlan[]> {
        const q = this.client.query.bind(this.client);
        const result = await q(`select * from usage_plans`);
        return result.rows.map(row => ({
            id: row.id,
            title: row.title,
            maxCredits: row.max_credits,
            creditGainAmount: row.credit_gain_amount,
            creditGainPeriodSeconds: row.credit_gain_period_seconds,
            visible: row.visible
        }));
    }

    async saveUsagePlan(usagePlan: UsagePlan) {
        const q = this.client.query.bind(this.client);
        await q(`
            insert into usage_plans (
                id, title, max_credits, credit_gain_amount, credit_gain_period_seconds, visible
            )
            values ($1, $2, $3, $4, $5, $6)
            on conflict (id) do update set
                title = $2,
                max_credits = $3,
                credit_gain_amount = $4,
                credit_gain_period_seconds = $5,
                visible = $6;
        `, [
            usagePlan.id,
            usagePlan.title,
            usagePlan.maxCredits,
            usagePlan.creditGainAmount,
            usagePlan.creditGainPeriodSeconds,
            usagePlan.visible
        ]);
    }
}