import {Client} from 'pg';
import {VkMessage} from "service/VkMessagesService";

export default class VkMessagesOrmService {
    constructor(
        private client: Client
    ) {}

    async start() {
        return this.client.query(`
            create table if not exists vk_messages (
                conversation_message_id bigint,
                peer_id bigint,
                from_id bigint,
                timestamp timestamp,
                text text,
                primary key (conversation_message_id, peer_id)
            );
        `).then(() => {
            this.client.query(`
                create index if not exists timestamp_index on vk_messages(timestamp);
            `);
            this.client.query(`
                create index if not exists peer_id_index on vk_messages(peer_id);
            `);
            this.client.query(`
                create index if not exists peer_id_timestamp_index ON vk_messages(peer_id, timestamp desc);
            `);
        });
    }

    async addMessage(message: VkMessage) {
        const timestamp = new Date(message.timestamp * 1000).toISOString();
        return this.client.query(
            `insert into vk_messages (conversation_message_id, peer_id, from_id, timestamp, text) values ($1, $2, $3, $4, $5) on conflict do nothing`,
            [message.conversationMessageId, message.peerId, message.fromId, timestamp, message.text]
        );
    }

    async getMessagesByPeerIdWithLimitSortedByTimestamp(peerId: number, limit: number) {
        const rows = await this.client.query(
            `select conversation_message_id, peer_id, from_id, timestamp, text from vk_messages where peer_id = $1 order by timestamp desc limit $2`,
            [peerId, limit]
        );
        return rows.rows.map(row => {
            return {
                conversationMessageId: row['conversation_message_id'],
                peerId: row['peer_id'],
                fromId: row['from_id'],
                timestamp: new Date(row['timestamp']).getTime()/1000,
                text: row['text'],
                attachments: []
            }
        });
    }
}