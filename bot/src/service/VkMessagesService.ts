import {Attachment, ExternalAttachment, MessageContext, VK} from "vk-io";
import VkMessagesOrmService from "orm/VkMessagesOrmService";
import {Context} from "../Context";
import {GroupsGroupFull, UsersUserFull} from "vk-io/lib/api/schemas/objects";

export type VkMessage = {
    conversationMessageId: number;
    peerId: number;
    fromId: number;
    timestamp: number;
    attachments: (Attachment | ExternalAttachment)[];
    text: string | null;
    forwardedMessages: VkMessage[];
}

export type VkChatMember = {
    memberId: number;
    displayName: string;
    firstName: string;
    lastName: string | null;
    isAdmin: boolean;
    type: "user" | "group";
}

export default class VkMessagesService {
    private static readonly MAX_ATTACHMENTS_PER_MESSAGE = 10;
    private vk!: VK;
    private messagesOrmService!: VkMessagesOrmService;

    constructor (private context: Context) {
        context.onReady(this.start.bind(this));
    }

    private messagesByPeerId: Map<number, VkMessage[]> = new Map();

    private start() {
        this.vk = this.context.vk!;
        this.messagesOrmService = this.context.vkMessagesOrmService!;

        this.vk.updates.start().then(() => {
            console.log("Started VK messages long polling");
        }).catch(error => {
            console.error('Error starting Long Polling:', error);
        });

        this.vk.updates.on('message_new', async (context, next) => {
            await this.processNewMessage(context);
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

    // Doesn't work, I have no idea why
    // async uploadDocumentAttachment(toId: number, filename: string, doc: string | Buffer): Promise<string> {
    //     const uploadServerResponse = await this.vk.api.docs.getMessagesUploadServer({
    //         type: "doc",
    //         peer_id: toId
    //     });
    //     const uploadServerUrl = uploadServerResponse.upload_url;
    //     const attachment = await this.vk.upload.messageDocument({
    //         peer_id: toId,
    //         source: {
    //             uploadUrl: uploadServerUrl,
    //             filename: filename,
    //             value: doc,
    //         }
    //     });
    //     return `doc${attachment.ownerId}_${attachment.id}${attachment.accessKey ? `_${attachment.accessKey}` : ''}`;
    // }

    async uploadPhotoAttachments(toId: number, images: (string | Buffer)[]): Promise<string[]> {
        const uploadServerResponse = await this.vk.api.photos.getMessagesUploadServer({});
        const uploadServerUrl = uploadServerResponse.upload_url;
        const attachments = await Promise.all(
            images.map(image => this.vk.upload.messagePhoto({
                peer_id: toId,
                source: {
                    uploadUrl: uploadServerUrl,
                    values: [{
                        value: image
                    }]
                }
            }))
        );
        return attachments.map(it => `photo${it.ownerId}_${it.id}${it.accessKey ? `_${it.accessKey}` : ''}`);
    }

    async send(toId: number, message: string, attachments: string[] = [], saveToHistory: boolean = true): Promise<number> {
        if (attachments.length > VkMessagesService.MAX_ATTACHMENTS_PER_MESSAGE) {
            console.warn(`[send] Too many attachments (${attachments.length}), only ${VkMessagesService.MAX_ATTACHMENTS_PER_MESSAGE} will be sent`);
            attachments = attachments.slice(0, VkMessagesService.MAX_ATTACHMENTS_PER_MESSAGE);
        }
        if (message.trim().length == 0 && attachments.length == 0)
            message = "(empty message)";
        let requestBody = {
            peer_id: toId,
            random_id: Math.floor(Math.random()*10000000),
            message,
            attachment: attachments.join(',')
        };
        return await this.vk.api.messages.send(requestBody).then(async (res) => {
            if (saveToHistory) {
                await this.messagesOrmService.addMessage({
                    fromId: 0,
                    conversationMessageId: res,
                    peerId: toId,
                    text: message,
                    attachments: [],
                    timestamp: new Date().getTime() / 1000,
                    forwardedMessages: []
                });
            }
            return res;
        });
    }

    async getChatMembers(peerId: number): Promise<VkChatMember[]> {
        const members = await this.context.vk.api.messages.getConversationMembers({
            peer_id: peerId
        });
        const userById = new Map<number, UsersUserFull>();
        const groupById = new Map<number, GroupsGroupFull>();
        members.profiles?.forEach(it => userById.set(it.id, it));
        members.groups?.forEach(it => groupById.set(it.id!, it));
        const result = members.items?.map(it => {
            const type: "group" | "user" = it.member_id! < 0 ? "group" : "user";
            const user = userById.get(it.member_id!);
            const group = groupById.get(-it.member_id!);
            const groupName = group?.name || "Unknown group";
            return {
                memberId: it.member_id!,
                displayName: type == "user" ? `${user.first_name} ${user.last_name}` : groupName,
                firstName: type == "user" ? user.first_name : groupName,
                lastName: type == "user" ? user.last_name : null,
                isAdmin: it.is_admin == true,
                type
            }
        });
        return result ? result : [];
    }

    private async processNewMessage(context: MessageContext) {
        const { peerId } = context;
        if (!this.messagesByPeerId.has(peerId)) {
            this.messagesByPeerId.set(peerId, []);
        }
        const message = this.vkMessageDtoToModel(context);
        this.messagesByPeerId.get(peerId)!.push(message);
        await this.messagesOrmService!.addMessage(message);
    }

    private vkMessageDtoToModel(context: MessageContext): VkMessage {
        const result: VkMessage = {
            conversationMessageId: context.conversationMessageId!,
            peerId: +context.peerId,
            fromId: +context.senderId,
            timestamp: +context.createdAt,
            attachments: context.attachments,
            text: typeof context.text == 'undefined' ? null : context.text,
            forwardedMessages: []
        }

        if (context.hasForwards) {
            for (const forward of context.forwards) {
                result.forwardedMessages.push(this.vkMessageDtoToModel(forward));
            }
        } else if (context.hasReplyMessage) {
            result.forwardedMessages.push(this.vkMessageDtoToModel(context.replyMessage!));
        }

        return result;
    }
}