import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Logger} from "../../../service/LoggingService";
import {Context} from "../../../Context";
import {downloadVkPhotoAttachment} from "./AssistantFunctionHelper";

export default class ImageSearchAndReplaceFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("ImageSearchAndReplaceFunction");
        });
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        this.logger.info("Searching and replacing image");
        const imageId = args['image_id'];
        const prompt = args['prompt'];
        const searchPrompt = args['search_prompt'];
        const negativePrompt = args['negative_prompt'] || null;

        await this.context.vkMessagesService.indicateActivity(message.peerId, "photo");
        const image = await downloadVkPhotoAttachment(invocationContext, imageId);
        const resultImage = await this.context.stabilityAiService.searchAndReplace(image, prompt, searchPrompt, negativePrompt);
        const attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, [resultImage]);
        attachments.forEach(attachment => invocationContext.addAttachment(attachment));
        const pseudoMessageText = "[INTERNAL] This is the result image.";
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
        return "Searches for an object in an image and replaces it with another object using StabilityAI services.";
    }

    getName(): string {
        return "image_search_and_replace";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                image_id: {
                    type: "string",
                    description: "ID of the image to search in"
                },
                prompt: {
                    type: "string",
                    description: "What you wish to see in the output image. A strong, descriptive prompt that clearly defines elements, colors, and subjects will lead to better results."
                },
                search_prompt: {
                    type: "string",
                    description: "Short description of what to replace in the image"
                },
                negative_prompt: {
                    type: "string",
                    description: "A blurb of text describing what you do not wish to see in the output image."
                }
            },
            required: []
        };
    }

}