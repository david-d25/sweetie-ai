import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";
import {Logger} from "../../../service/LoggingService";

export default class ImageDrawFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("DrawImageFunction");
        });
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const prompt = args['prompt'];
        const negativePrompt = args['negative_prompt'] || null;
        const aspectRatio = args['aspect_ratio'] || "16:9";
        let image: Buffer;
        try {
            await this.context.vkMessagesService.indicateActivity(message.peerId, "photo");
            image = await this.context.stabilityAiService.generateImage(prompt, negativePrompt, aspectRatio);
        } catch (e: any) {
            console.error(e);
            throw new Error(
                `Failed to draw image (${e.message}). Try adjusting the prompt or tell user that you couldn't draw the image.`
            );
        }
        let attachments;
        try {
            await this.context.vkMessagesService.indicateActivity(message.peerId, "photo");
            attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, [image]);
        } catch (e: any) {
            this.logger.error("Failed to attach image to message");
            console.error(e);
            throw new Error(
                `Failed to attach image to message (${e.message}). ` +
                `This happens sometimes, please try again or report back to user.`
            );
        }
        attachments.forEach(attachment => invocationContext.addAttachment(attachment));
        const pseudoMessageText = "[INTERNAL] This is the image you have drawn.";
        invocationContext.appendMessage({
            role: "user",
            content: [
                {
                    type: "text",
                    text: pseudoMessageText
                }, {
                    type: "image_url",
                    image_url: {
                        url: "data:image/png;base64," + image.toString('base64')
                    }
                }
            ]
        });
        invocationContext.chargeCredits(6);
        return "Image is attached to message.";
    }

    getDescription(): string {
        return "Draws image using Stable Diffusion. If user provided a reference image, use 'draw_similar' instead.";
    }

    getName(): string {
        return "draw";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "What you wish to see in the output image. A strong, descriptive prompt that clearly defines elements, colors, and subjects will lead to better results. English only."
                },
                negative_prompt: {
                    type: "string",
                    description: "A blurb of text describing what you do NOT wish to see in the output image."
                },
                aspect_ratio: {
                    type: "string",
                    description: "The aspect ratio of the output image. 16:9 by default.",
                    enum: ["16:9", "1:1", "21:9", "2:3", "3:2", "4:5", "5:4", "9:16", "9:21"]
                }
            },
            required: ["prompt"]
        };
    }

}