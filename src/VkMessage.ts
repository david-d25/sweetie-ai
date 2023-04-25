export type VkMessage = {
    id: number;
    peerId: number;
    fromId: number;
    timestamp: number;
    text: string | null;
}