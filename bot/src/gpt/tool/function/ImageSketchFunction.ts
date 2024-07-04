import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Logger} from "../../../service/LoggingService";
import {Context} from "../../../Context";
import {downloadVkPhotoAttachment} from "./AssistantFunctionHelper";

export default class ImageSketchFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("ImageSketchFunction");
        });
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const imageId = args['image_id'];
        const prompt = args['prompt'];
        const controlStrength = args['control_strength'] || 0.7;
        const negativePrompt = args['negative_prompt'] || null;

        this.logger.info(`Sketching image, image id: ${imageId}, control strength: ${controlStrength}, prompt: '${prompt}', negative prompt: '${negativePrompt}'`);

        await this.context.vkMessagesService.indicateActivity(message.peerId, "photo")
        const image = await downloadVkPhotoAttachment(invocationContext, imageId);
        const resultImage = await this.context.stabilityAiService.sketch(image, prompt, controlStrength, negativePrompt);
        const attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, [resultImage]);
        attachments.forEach(attachment => invocationContext.addAttachment(attachment));
        const pseudoMessageText = "[INTERNAL] This is the image with sketch applied.";
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
        return "Turns rough sketch into realistic image";
    }

    getName(): string {
        return "sketch";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                image_id: {
                    type: "string",
                    description: "ID of the image to convert"
                },
                prompt: {
                    type: "string",
                    description: "What you wish to see in the output image. A strong, descriptive prompt that clearly defines elements, colors, and subjects will lead to better results."
                },
                control_strength: {
                    type: "number",
                    description: "How much influence, or control, the image has on the generation. Represented as a float between 0 and 1. 0.7 by default.",
                },
                negative_prompt: {
                    type: "string",
                    description: "A prompt that describes what you don't want to see in the output image"
                },
            },
            required: ["image_id", "prompt"]
        };
    }

}