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
            "Call 'list_sticker_packs' or 'see_sticker_pack' before 'send_sticker' to visually " +
            "see and choose what sticker to use. ";
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