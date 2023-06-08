import {VkMessage} from "./VkMessage";
import {VK} from "vk-io";

export default class VkMessagesService {
    constructor (
        private vk: VK
    ) {}

    private static readonly HISTORY_MAX_MESSAGES = 4000;
    private histories: Map<number, VkMessage[]> = new Map();

    private messagesByPeerId: Map<number, VkMessage[]> = new Map();

    start() {
        this.vk.updates.start().then(() => {
            console.log("Started");
        }).catch(error => {
            console.error('Error starting Long Polling:', error);
        });

        this.vk.updates.on('message_new', async (context, next) => {
            const { id, senderId, peerId, text, createdAt } = context;

            console.log(`Got message from id ${senderId}: '${text}'`);

            if (!this.messagesByPeerId.has(peerId))
                this.messagesByPeerId.set(peerId, []);

            const peerMessages = this.messagesByPeerId.get(peerId)!;
            const message = {
                id,
                peerId,
                fromId: senderId,
                timestamp: createdAt,
                text: typeof text == 'undefined' ? null : text
            };
            peerMessages.push(message);

            if (!this.histories.has(peerId))
                this.histories.set(peerId, []);
            const history = this.histories.get(peerId)!;
            history.push(message);
            if (history.length > VkMessagesService.HISTORY_MAX_MESSAGES)
                history.shift();

            await next();
        });

        this.vk.updates.on('error', error => {
            console.error('Error in updates:', error);
        });
    }

    popSinglePeerIdMessages(): VkMessage[] {
        if (this.messagesByPeerId.size == 0)
            return [];
        const key = this.messagesByPeerId.keys().next().value;
        const result = this.messagesByPeerId.get(key)!;
        this.messagesByPeerId.delete(key);
        return result;
    }

    getHistory(peerId: number, count: number): VkMessage[] {
        if (this.histories.has(peerId)) {
            const history = this.histories.get(peerId)!;
            if (history.length > count)
                return history.slice(history.length - count);
            else
                return history;
        } else {
            return [];
        }
    }

    async send(toId: number, message: string) {
        await this.vk.api.messages.send({
            peer_id: toId,
            random_id: Math.floor(Math.random()*10000000),
            message
        }).then(() => {
            console.log(`Sent message to id ${toId}: '${message}'`);
        }).catch(e => {
            console.error(`Failed to send message to id ${toId}: '${message}'`, e);
        });
    }
}