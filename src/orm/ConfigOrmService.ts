import {Client} from "pg";

export default class ConfigOrmService {
    constructor(
        private client: Client
    ) {}

    start() {
        return this.client.query(`
            create table if not exists config (
                key text primary key,
                value text
            );
        `);
    }

    async getConfigEntry(key: string): Promise<string | null> {
        const rows = await this.client.query(
            `select value from config where key = $1`,
            [key]
        );
        if (rows.rows.length === 0) {
            return null;
        }
        return rows.rows[0]['value'];
    }

    async getConfig(): Promise<object> {
        const rows = await this.client.query(
            `select key, value from config`
        );
        const config: {[index: string]: string | number} = {};
        rows.rows.forEach(row => {
            config[row['key']] = row['value'];
        });
        return config;
    }
}