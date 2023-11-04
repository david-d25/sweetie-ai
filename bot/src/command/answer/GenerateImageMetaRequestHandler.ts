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
            response.metaRequestErrors.push("generateImage: wrong arguments!");
            return;
        }
        const prompt = request.args[0];
        const numImages = request.args[1] || 4;
        let urls;
        try {
            urls = await this.context.imageGenerationService.generateImages(prompt, numImages);
        } catch (e: any) {
            response.metaRequestErrors.push(`Не получилось создать картинку с текстом "${prompt}" (${e.message})`);
            return;
        }
        let attachments;
        try {
            attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, urls);
        } catch (e: any) {
            console.error(e);
            response.metaRequestErrors.push(`Не получилось прикрепить картинку (${e.message})`);
            return;
        }
        response.attachments.push(...attachments);
    }
}