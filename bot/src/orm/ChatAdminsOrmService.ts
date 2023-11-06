import {Context} from "../Context";

export default class ChatAdminsOrmService {
    constructor(private context: Context) {
        context.onReady(() => this.init());
    }

    private async init() {
        const { postgresClient } = this.context;
        await postgresClient.query(`
            CREATE TABLE IF NOT EXISTS chat_admins (
                peer_id bigint not null,
                user_id bigint not null,
                primary key (peer_id, user_id)
            )
        `);
        await postgresClient.query(`
            CREATE INDEX IF NOT EXISTS chat_admins_peer_id_idx ON chat_admins (peer_id)
        `);
    }

    async getChatAdmins(peerId: number): Promise<number[]> {
        const { postgresClient } = this.context;
        const result = await postgresClient.query(`
            SELECT user_id FROM chat_admins
            WHERE peer_id = $1
        `, [peerId]);
        return result.rows.map(row => +row.user_id);
    }

    async isUserAdmin(peerId: number, userId: number): Promise<boolean> {
        const { postgresClient } = this.context;
        const result = await postgresClient.query(`
            SELECT 1 FROM chat_admins
            WHERE peer_id = $1 AND user_id = $2
        `, [peerId, userId]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    async addAdmin(peerId: number, userId: number): Promise<void> {
        const { postgresClient } = this.context;
        await postgresClient.query(`
            INSERT INTO chat_admins (peer_id, user_id)
            VALUES ($1, $2)
        `, [peerId, userId]);
    }

    async removeAdmin(peerId: number, userId: number): Promise<void> {
        const { postgresClient } = this.context;
        await postgresClient.query(`
            DELETE FROM chat_admins
            WHERE peer_id = $1 AND user_id = $2
        `, [peerId, userId]);
    }
}