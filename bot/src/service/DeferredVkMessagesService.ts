import {Context} from "../Context";

export default class DeferredVkMessagesService {
    constructor(private context: Context) {
        context.onReady(() => this.init());
    }

    private init() {
        setInterval(this.scheduledRoutine.bind(this), 3000);
    }

    private scheduledRoutine() {
        this.checkAndSendMessages().catch(
            error => console.error('DeferredVkMessagesService.scheduledRoutine: error', error)
        );
    }

    private async checkAndSendMessages() {
        const deferredMessages = await this.context.deferredVkMessagesOrmService.getAll();
        for (const message of deferredMessages) {
            if (message.sendAt <= new Date()) {
                console.log(`[${message.peerId}] Sending deferred message to ${message.peerId}, text=${message.text}`);
                await this.context.vkMessagesService.send(message.peerId, message.text);
                await this.context.deferredVkMessagesOrmService.delete(message.id);
            }
        }
    }

    public async sendLater(peerId: number, messageText: string, waitSeconds: number): Promise<void> {
        const sendAt = new Date();
        sendAt.setSeconds(sendAt.getSeconds() + waitSeconds);
        await this.context.deferredVkMessagesOrmService.save({
            id: -1,
            peerId: peerId,
            sendAt: sendAt,
            text: messageText
        });
    }
}

export type DeferredVkMessageModel = {
    id: number,
    peerId: number,
    sendAt: Date,
    text: string
}