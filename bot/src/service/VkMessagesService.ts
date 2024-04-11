import {Attachment, ExternalAttachment, MessageContext, VK} from "vk-io";
import VkMessagesOrmService from "orm/VkMessagesOrmService";
import {Context} from "../Context";
import {
    GroupsGroupFull,
    MessagesMessage,
    MessagesMessageAttachment,
    UsersUserFull
} from "vk-io/lib/api/schemas/objects";
import FormData from "form-data";
import axios from "axios";
import {optimizeForVkAudioMessage} from "../util/AudioUtil";

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

    // TODO move to orm layer
    async getDatabaseHistory(peerId: number, count: number): Promise<VkMessage[]> {
        return (await this.messagesOrmService.getMessagesByPeerIdWithLimitSortedByTimestamp(peerId, count)).reverse();
    }

    async getMessage(peerId: number, startMessageId: number): Promise<VkMessage | null> {
        const history = await this.context.vk.api.messages.getHistory({
            peer_id: peerId,
            start_message_id: startMessageId,
            count: 1
        });
        if (history.items.length == 0)
            return null;
        return this.vkHistoryMessageToModel(history.items[0]);
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

    // Doesn't work, I have no idea why
    async uploadVoiceMessage(toId: number, audio: Buffer) {
        const uploadServerResponse = await this.vk.api.docs.getMessagesUploadServer({
            type: "audio_message",
            peer_id: toId,
        });
        const uploadServerUrl = uploadServerResponse.upload_url;
        // const audioMessage = await this.vk.upload.audioMessage({
        //     peer_id: toId,
        //     source: {
        //         // uploadUrl: uploadServerUrl,
        //         values: [{
        //             value: await optimizeForVkAudioMessage(audio),
        //             contentType: 'audio/opus',
        //         }]
        //     }
        // });
        const optimizedAudio = await optimizeForVkAudioMessage(audio);
        const form = new FormData();
        form.append('file', optimizedAudio, {
            filename: 'audio.opus',
            // contentType: 'audio/opus'
        });
        const config = {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data',
            }
        };
        const uploadResponse = await axios.post(uploadServerUrl, form, config);
        const uploadedAudioData = uploadResponse.data;
        const saveResponse = await this.vk.api.docs.save({ file: uploadedAudioData['file'] });
        console.dir(saveResponse);
        const audioMessage = saveResponse.data['response']['audio_message']
        return `audio_message${audioMessage.ownerId}_${audioMessage.id}`;
    }

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

    async indicateActivity(peerId: number, type: "audiomessage" | "file" | "photo" | "typing" | "video") {
        try {
            await this.vk.api.messages.setActivity({
                peer_id: peerId,
                type
            });
        } catch (e) {
            console.error(`[${peerId}] Could not indicate activity`, e);
        }
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

    private vkHistoryMessageToModel(message: MessagesMessage): VkMessage {
        const result: VkMessage = {
            conversationMessageId: message.conversation_message_id!,
            peerId: +message.peer_id!,
            fromId: +message.from_id!,
            timestamp: +message.date!,
            attachments: message.attachments?.map((a: any) => a[a.type] ? a[a.type] as Attachment : a) as Attachment[],
            text: typeof message.text == 'undefined' ? null : message.text,
            forwardedMessages: []
        }

        if (message.fwd_messages) {
            for (const forward of message.fwd_messages) {
                result.forwardedMessages.push(this.vkHistoryMessageToModel(forward));
            }
        }

        return result;
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