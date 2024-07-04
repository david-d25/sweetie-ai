import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Logger} from "../../../service/LoggingService";
import {Context} from "../../../Context";
import {downloadVkPhotoAttachment} from "./AssistantFunctionHelper";

export default class ImageRemoveBackgroundFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("ImageRemoveBackgroundFunction");
        });
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        this.logger.info("Removing background from image");
        const imageId = args['image_id'];
        await this.context.vkMessagesService.indicateActivity(message.peerId, "photo")
        const image = await downloadVkPhotoAttachment(invocationContext, imageId);
        const resultImage = await this.context.stabilityAiService.removeBackground(image);
        const attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, [resultImage]);
        attachments.forEach(attachment => invocationContext.addAttachment(attachment));
        const pseudoMessageText = "[INTERNAL] This is the image with background removed.";
        invocationContext.appendMessage({
            role: "user",
            content: [
                {
                    type: "text",
                    text: pseudoMessageText
                }, {
                    type: "image_url",
                    image_url: {
                        url: "data:image/png;base64," + resultImage.toString('base64')
                    }
                }
            ]
        });
        invocationContext.chargeCredits(3);
        return "Image is attached to message.";
    }

    getDescription(): string {
        return "Removes background from an image";
    }

    getName(): string {
        return "image_remove_background";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                image_id: {
                    type: "string",
                    description: "ID of the image to remove background from"
                }
            },
            required: ["image_id"]
        }
    }

}