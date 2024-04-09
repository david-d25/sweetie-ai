import {Context} from "../Context";
import {Client} from "pg";

export default class AppCeosOrmService {
    private client!: Client;

    constructor(private context: Context) {
        context.onReady(this.start.bind(this));
    }

    async start() {
        this.client = this.context.postgresClient;
        const q = this.client.query.bind(this.client);
        await q(`
            create table if not exists app_ceos (
                user_id bigint primary key
            );
        `);
    }

    async getAll(): Promise<number[]> {
        const q = this.client.query.bind(this.client);
        const result = await q(`
            select user_id
            from app_ceos;
        `);
        return result.rows.map(row => +row.user_id);
    }

    async add(userId: number): Promise<void> {
        const q = this.client.query.bind(this.client);
        await q(`
            insert into app_ceos (user_id)
            values ($1);
        `, [userId]);
    }

    async remove(userId: number): Promise<void> {
        const q = this.client.query.bind(this.client);
        await q(`
            delete from app_ceos
            where user_id = $1;
        `, [userId]);
    }

    async exists(userId: number): Promise<boolean> {
        const q = this.client.query.bind(this.client);
        const result = await q(`
            select user_id
            from app_ceos
            where user_id = $1;
        `, [userId]);
        return result.rows.length > 0;
    }
}