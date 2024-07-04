import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Logger} from "../../../service/LoggingService";
import {Context} from "../../../Context";
import {downloadVkPhotoAttachment} from "./AssistantFunctionHelper";

export default class ImageStructureFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("ImageStructureFunction");
        });
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const imageId = args['image_id'];
        const prompt = args['prompt'];
        const negativePrompt = args['negative_prompt'] ?? null;
        const controlStrength = args['control_strength'] ?? 0.7;

        this.logger.info(`Drawing image with structure, image id: ${imageId}, control strength: ${controlStrength}, prompt: '${prompt}', negative prompt: '${negativePrompt}'`);

        await this.context.vkMessagesService.indicateActivity(message.peerId, "photo")
        const image = await downloadVkPhotoAttachment(invocationContext, imageId);
        const resultImage = await this.context.stabilityAiService.structure(image, prompt, controlStrength, negativePrompt);
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
        return "Generates an image by maintaining the structure of an input image. Call this instead of 'draw' when user provides a reference image to you.";
    }

    getName(): string {
        return "draw_similar";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                image_id: {
                    type: "string",
                    description: "ID of the image to structure"
                },
                prompt: {
                    type: "string",
                    description: "What you wish to see in the output image. Describe what you see + add some changing elements to it."
                },
                negative_prompt: {
                    type: "string",
                    description: "What you do not wish to see in the output image"
                },
                control_strength: {
                    type: "number",
                    description: "How much influence, or control, the input image has on the generation. Should be a number between 0 and 1. Defaults to 0.7."
                }
            },
            required: []
        };
    }

}