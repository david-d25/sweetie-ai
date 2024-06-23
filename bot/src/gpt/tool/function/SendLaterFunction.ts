import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";
import {Logger} from "../../../service/LoggingService";

export default class SendLaterFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("SendLaterFunction");
        });
    }

    getDescription(): string {
        return "Sends a message later";
    }

    getName(): string {
        return "send_later";
    }

    getParameters(): AssistantObject {
        return {
            type: "object",
            properties: {
                delay: {
                    type: "integer",
                    description: "Delay in seconds"
                },
                message: {
                    type: "string",
                    description: "Message to send"
                }
            },
            required: ["delay", "message"]
        };
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const messageText = args['message'];
        const waitSeconds = args['delay'];
        if (isNaN(waitSeconds)) {
            throw new Error("Delay should be a number");
        }
        if (!messageText) {
            throw new Error("Message should not be empty");
        }
        if (waitSeconds <= 0) {
            throw new Error("Delay should be positive");
        }
        await this.context.deferredVkMessagesService.sendLater(message.peerId, messageText, waitSeconds);
        this.logger.newSublogger(`peer_id:${message.peerId}`).info(
            `Scheduled message to be sent after ${waitSeconds} seconds`
        );
        return "Message is scheduled to be sent later";
    }
}