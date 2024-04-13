import {Client} from 'pg';
import {VkMessage} from "service/VkMessagesService";
import {Context} from "../Context";
import {Attachment, ExternalAttachment} from "vk-io";

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
        await q(`create index if not exists vk_messages__from_id_index on vk_messages(from_id);`);
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

    async saveMessage(message: VkMessage) {
        const timestamp = new Date(message.timestamp * 1000).toISOString();
        await this.client.query(
            `
                insert into vk_messages (conversation_message_id, peer_id, from_id, timestamp, text)
                values ($1, $2, $3, $4, $5)
                on conflict (conversation_message_id, peer_id)
                    do update set
                                  from_id = $3,
                                  timestamp = $4,
                                  text = $5
            `,
            [message.conversationMessageId, message.peerId, message.fromId, timestamp, message.text]
        );
        for (const [i, attachment] of message.attachments.entries()) {
            await this.saveAttachment(message, i, attachment);
        }
        for (const forwardedMessage of message.forwardedMessages) {
            await this.saveMessage(forwardedMessage);
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

    async saveAttachment(message: VkMessage, orderIndex: number, attachment: Attachment | ExternalAttachment) {
        await this.client.query(
            `
                    insert into vk_message_attachments (
                        conversation_message_id, peer_id, order_index, attachment_dto_json
                    )
                    values ($1, $2, $3, $4)
                    on conflict (
                        conversation_message_id,
                        peer_id,
                        order_index
                    ) do update set attachment_dto_json = $4
                `,
            [message.conversationMessageId, message.peerId, orderIndex, JSON.stringify(attachment)]
        );
    }

    async getMessagesByPeerIdWithLimitSortedByTimestamp(peerId: number, limit: number): Promise<VkMessage[]> {
        const rows = await this.client.query(
            `select conversation_message_id, peer_id
                from vk_messages where peer_id = $1 order by timestamp desc limit $2`,
            [peerId, limit]
        );
        const resultPromises = rows.rows.map(async row => {
            const conversationMessageId = row['conversation_message_id'];
            const peerId = row['peer_id'];
            const result = await this.getMessage(conversationMessageId, peerId);
            if (result === null) {
                console.error(
                    `Message with conversation_message_id=${conversationMessageId} and peer_id=${peerId} not found`
                );
                return null;
            }
            return result;
        });
        const resultUnfiltered = await Promise.all(resultPromises);
        return resultUnfiltered.filter(it => it !== null) as VkMessage[];
    }

    async getMessage(conversationMessageId: number, peerId: number): Promise<VkMessage | null> {
        const rows = await this.client.query(
            `select conversation_message_id, peer_id, from_id, timestamp, text
                from vk_messages where peer_id = $1 and conversation_message_id = $2`,
            [peerId, conversationMessageId]
        );
        if (rows.rows.length === 0) {
            return null;
        }
        const row = rows.rows[0];
        const result: VkMessage = {
            conversationMessageId: row['conversation_message_id'],
            peerId: row['peer_id'],
            fromId: row['from_id'],
            timestamp: new Date(row['timestamp']).getTime()/1000,
            text: row['text'],
            attachments: [],
            forwardedMessages: []
        };
        const attachmentsRows = await this.client.query(
            `
                select attachment_dto_json 
                from vk_message_attachments
                where conversation_message_id = $1 and peer_id = $2
                order by order_index
            `,
            [result.conversationMessageId, result.peerId]
        );
        result.attachments = attachmentsRows.rows.map(row => row['attachment_dto_json']);
        const forwardedMessagesRows = await this.client.query(
            `
                select forwarded_conversation_message_id, forwarded_peer_id
                from vk_message_forwards
                where conversation_message_id = $1 and peer_id = $2
            `,
            [result.conversationMessageId, result.peerId]
        );
        const forwardedMessagesPromises = forwardedMessagesRows.rows.map(row => {
            return this.getMessage(row['forwarded_conversation_message_id'], row['forwarded_peer_id']);
        });
        const forwardedMessagesUnfiltered = await Promise.all(forwardedMessagesPromises);
        result.forwardedMessages = forwardedMessagesUnfiltered
            .filter(it => it !== null)
            .sort((a, b) => a!.timestamp - b!.timestamp) as VkMessage[];
        return result;
    }
}