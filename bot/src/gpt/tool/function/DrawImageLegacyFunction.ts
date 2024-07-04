import AssistantFunction, {InvocationContext, AssistantObject} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";
import {Logger} from "../../../service/LoggingService";
import {CompletionUserMessageImageUrlContentItemDto} from "../../../service/ChatGptService";

export default class DrawImageLegacyFunction implements AssistantFunction {
    private logger!: Logger;
    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("DrawImageFunction");
        });
    }

    getDescription(): string {
        return "Draws an image with Dall-E. The image will be visible to you.";
    }

    getName(): string {
        return "draw_legacy";
    }

    getParameters(): AssistantObject {
        return {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "Prompt for the image, english only"
                }
            },
            required: ["prompt"]
        };
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        this.logger.info("Drawing image");
        const prompt = args['prompt'];
        let urls;
        try {
            await this.context.vkMessagesService.indicateActivity(message.peerId, "photo");
            urls = await this.context.imageGenerationService.generateImages(prompt);
        } catch (e: any) {
            throw new Error(
                `Failed to draw (${e.message}). Try adjusting the prompt or tell user that you couldn't draw the image.`
            );
        }
        let attachments;
        try {
            await this.context.vkMessagesService.indicateActivity(message.peerId, "photo");
            attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, urls);
        } catch (e: any) {
            this.logger.error("Failed to attach image to message: " + e);
            throw new Error(
                `Failed to attach image to message (${e.message}). ` +
                `This happens sometimes, please try again or report back to user.`
            );
        }
        attachments.forEach(attachment => invocationContext.addAttachment(attachment));
        const pseudoMessageText = "[INTERNAL] This is the image you have drawn.";
        const pseudoContent: CompletionUserMessageImageUrlContentItemDto[] = urls.map(url => {
            return {
                type: "image_url",
                image_url: { url: url }
            }
        });
        invocationContext.appendMessage({
            role: "user",
            content: [
                {
                    type: "text",
                    text: pseudoMessageText
                },
                ...pseudoContent
            ]
        });
        return "Image is attached to message.";
    }
}