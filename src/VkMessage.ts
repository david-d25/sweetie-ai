export type VkMessage = {
    conversationMessageId: number;
    peerId: number;
    fromId: number;
    timestamp: number;
    text: string | null;
}