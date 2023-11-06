import {Client} from 'pg';
import {VkMessage} from "service/VkMessagesService";
import {Context} from "../Context";

export default class VkMessagesOrmService {
    private client!: Client;
    constructor(private context: Context) {
        context.onReady(this.start.bind(this));
    }

    async start() {
        this.client = this.context.postgresClient!;
        const q = this.client.query.bind(this.client);
        await q(`
            create table if not exists vk_messages (
                conversation_message_id bigint,
                peer_id bigint,
                from_id bigint,
                timestamp timestamp,
                text text,
                primary key (conversation_message_id, peer_id)
            );
        `);
        await q(`create index if not exists timestamp_index on vk_messages(timestamp);`);
        await q(`create index if not exists peer_id_index on vk_messages(peer_id);`);
        await q(`create index if not exists peer_id_timestamp_index ON vk_messages(peer_id, timestamp desc);`);
        await q(`
            create table if not exists vk_message_forwards (
                conversation_message_id bigint,
                peer_id bigint,
                forwarded_conversation_message_id bigint,
                forwarded_peer_id bigint,
                primary key (conversation_message_id, peer_id, forwarded_conversation_message_id, forwarded_peer_id),
                foreign key (conversation_message_id, peer_id)
                    references vk_messages(conversation_message_id, peer_id)
                    on delete cascade on update cascade,
                foreign key (forwarded_conversation_message_id, forwarded_peer_id)
                    references vk_messages(conversation_message_id, peer_id)
                    on delete cascade on update cascade
            );
        `);
        await q(`
            create index if not exists conversation_message_id_peer_id_index
                on vk_message_forwards(conversation_message_id, peer_id);
        `);
        await q(`
            create table if not exists vk_message_attachments (
                conversation_message_id bigint,
                peer_id bigint,
                order_index int,
                attachment_dto_json jsonb,
                primary key (conversation_message_id, peer_id, order_index),
                foreign key (conversation_message_id, peer_id)
                    references vk_messages(conversation_message_id, peer_id)
                    on delete cascade on update cascade
            );
        `);
        await q(`
            create index if not exists vk_message_attachments__conversation_message_id_peer_id_index
                on vk_message_attachments(conversation_message_id, peer_id);
        `);
    }

    async addMessage(message: VkMessage) {
        const timestamp = new Date(message.timestamp * 1000).toISOString();
        await this.client.query(
            `
                insert into vk_messages (conversation_message_id, peer_id, from_id, timestamp, text)
                values ($1, $2, $3, $4, $5)
                on conflict do nothing
            `,
            [message.conversationMessageId, message.peerId, message.fromId, timestamp, message.text]
        );
        for (const [i, attachment] of message.attachments.entries()) {
            await this.client.query(
                `
                    insert into vk_message_attachments (
                        conversation_message_id, peer_id, order_index, attachment_dto_json
                    )
                    values ($1, $2, $3, $4)
                    on conflict do nothing
                `,
                [message.conversationMessageId, message.peerId, i, JSON.stringify(attachment)]
            );
        }
        for (const forwardedMessage of message.forwardedMessages) {
            await this.addMessage(forwardedMessage);
            await this.client.query(
                `
                    insert into vk_message_forwards (
                        peer_id, conversation_message_id, forwarded_peer_id, forwarded_conversation_message_id
                    )
                    values ($1, $2, $3, $4)
                    on conflict do nothing
                `,
                [
                    message.peerId,
                    message.conversationMessageId,
                    forwardedMessage.peerId,
                    forwardedMessage.conversationMessageId
                ]
            );
        }
    }

    async getMessagesByPeerIdWithLimitSortedByTimestamp(peerId: number, limit: number) {
        // TODO: forwarded messages, attachments
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
                attachments: [],
                forwardedMessages: []
            }
        });
    }
}