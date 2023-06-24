import {VK} from "vk-io";
import VkMessagesOrmService from "orm/VkMessagesOrmService";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import {response} from "../template/HelpCommandTemplates";

export type VkMessage = {
    conversationMessageId: number;
    peerId: number;
    fromId: number;
    timestamp: number;
    text: string | null;
}

export default class VkMessagesService {
    constructor (
        private vk: VK,
        private messagesOrmService: VkMessagesOrmService
    ) {}

    private messagesByPeerId: Map<number, VkMessage[]> = new Map();

    start() {
        this.vk.updates.start().then(() => {
            console.log("Started");
        }).catch(error => {
            console.error('Error starting Long Polling:', error);
        });

        this.vk.updates.on('message_new', async (context, next) => {
            const { conversationMessageId, senderId, peerId, text, createdAt } = context;

            if (!this.messagesByPeerId.has(peerId))
                this.messagesByPeerId.set(peerId, []);

            const peerMessages = this.messagesByPeerId.get(peerId)!;
            const message = {
                conversationMessageId: conversationMessageId!,
                peerId: peerId,
                fromId: senderId,
                timestamp: createdAt,
                text: typeof text == 'undefined' ? null : text
            };

            console.log(`Got message from id ${message.fromId}: '${message.text}'`);

            if (context.attachments.length > 0) {
                if (message.text == null)
                    message.text = '';
                for (const attachment of context.attachments) {
                    message.text += ` (attachment: ${attachment.type})`;
                }
            }

            peerMessages.push(message);

            await this.messagesOrmService.addMessage(message);
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

    async getHistory(peerId: number, count: number): Promise<VkMessage[]> {
        return (await this.messagesOrmService.getMessagesByPeerIdWithLimitSortedByTimestamp(peerId, count)).reverse();
    }

    async send(toId: number, message: string, attachedImageUrls: string[] = []) {
        let requestBody = {
            peer_id: toId,
            random_id: Math.floor(Math.random()*10000000),
            message,
            attachment: undefined as string | undefined
        };

        try {
            if (attachedImageUrls.length > 0) {
                const uploadServerResponse = await this.vk.api.photos.getMessagesUploadServer({});
                const uploadServerUrl = uploadServerResponse.upload_url;

                const attachments = [];
                for (const imageUrl of attachedImageUrls) {
                    let formData = new FormData();
                    const downloadResponse = await axios({
                        method: 'GET',
                        url: imageUrl,
                        responseType: 'arraybuffer',
                    });
                    const imageData = downloadResponse.data;
                    formData.append('photo', Buffer.from(imageData), {
                        filename: 'image.jpg',
                        contentType: 'image/jpeg',
                    });
                    const response = await axios.post(uploadServerUrl, formData, {
                        headers: {
                            ...formData.getHeaders(),
                        },
                    });
                    const saveResponse = await this.vk.api.photos.saveMessagesPhoto({
                        server: response.data.server,
                        photo: response.data.photo,
                        hash: response.data.hash
                    });
                    const photo = saveResponse[0];
                    attachments.push(`photo${photo.owner_id}_${photo.id}`);
                }

                requestBody.attachment = attachments.join(',');
            }
        } catch (e) {
            console.error('Failed to attach image', e);
            requestBody.message += "\n\n(не получилось прикрепить картинку)";
        }

        await this.vk.api.messages.send(requestBody).then(async (res) => {
            await this.messagesOrmService.addMessage({
                fromId: 0,
                conversationMessageId: res,
                peerId: toId,
                text: message,
                timestamp: new Date().getTime()/1000
            });
            console.log(`Sent message to id ${toId}: '${message}'`);
        }).catch(e => {
            console.error(`Failed to send message to id ${toId}: '${message}'`, e);
        });
    }
}