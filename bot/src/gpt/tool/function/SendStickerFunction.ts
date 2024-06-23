import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";
import {Logger} from "../../../service/LoggingService";

export default class SendStickerFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        this.context.onReady(() => {
            this.logger = this.context.loggingService.getRootLogger().newSublogger('SendStickerFunction');
        });
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const stickerId = args['sticker_id'];
        const continueConversation = args['continue'] || false;

        if (isNaN(stickerId)) {
            return "Invalid sticker ID.";
        }

        this.logger.newSublogger(`peer_id:${message.peerId}`).info(`Sending sticker id=${stickerId}`);

        const peerId = message.peerId;
        await this.context.vkMessagesService.sendSticker(peerId, stickerId);
        if (!continueConversation) {
            invocationContext.requestStop();
        } else {
            const pseudoMessageText = "[INTERNAL] This is the sticker you have sent.";
            invocationContext.appendMessage({
                role: "user",
                content: [
                    {
                        type: "text",
                        text: pseudoMessageText
                    }, {
                        type: "image_url",
                        image_url: {
                            url: this.context.vkStickerPacksService.getStickerUrl(stickerId)
                        }
                    }
                ]
            });
        }
        return "Sticker sent.";
    }

    getDescription(): string {
        return "Sends a sticker to the chat. " +
            "The main idea of sending a sticker is to express an emotion. Send a sticker to express all kinds of " +
            "emotions: love, disagreement, sadness, happiness, laugh, drinking coffee, working, etc. " +
            "Sticker is not just a picture, it's an **emotion**, so pay attention to the emotion and not" +
            "the picture itself, and answer with an emotion too! Don't comment the sticker itself, comment the emotion. " +
            "For example, when a user sends a love emotion, you can repeat with love emotion too, but " +
            "try using a different sticker or sticker pack so you don't feel too repetitive. " +
            "Use 'list_sticker_packs' and 'see_sticker_pack' to visually see and choose what sticker to use. ";
    }

    getName(): string {
        return "send_sticker";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                sticker_id: {
                    type: "integer",
                    description: "Sticker ID to send. To know the ID, use 'list_sticker_packs' and 'see_sticker_pack'."
                },
                continue: {
                    type: "boolean",
                    description: "Whether to continue the conversation (send another message) " +
                        "after sending the sticker. False by default."
                }
            },
            required: ["sticker_id"],
        };
    }
}