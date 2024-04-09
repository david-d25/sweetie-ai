import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";

export default class GenerateImageMetaRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName === "generateImage";
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (request.args.length < 1) {
            response.metaRequestResults.push("SYSTEM: The 'generateImage' function was invoked with wrong arguments!");
            return;
        }
        const prompt = request.args[0];
        let urls;
        try {
            await this.context.vkMessagesService.indicateActivity(message.peerId, "photo");
            urls = await this.context.imageGenerationService.generateImages(prompt);
        } catch (e: any) {
            response.metaRequestResults.push(`SYSTEM: The 'generateImage' function failed (${e.message}). This happens sometimes, try adjusting your prompt or tell user that you couldn't draw the image`);
            console.log(`[${message.peerId}] Failed to generate image: ${e.message}`);
            return;
        }
        let attachments;
        try {
            await this.context.vkMessagesService.indicateActivity(message.peerId, "photo");
            attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, urls);
        } catch (e: any) {
            console.error(e);
            response.metaRequestErrors.push(`SYSTEM: The 'generateImage' failed to attach image to message (${e.message}). This happens sometimes, please try again or report back to user.`);
            return;
        }
        response.attachments.push(...attachments);
    }
}