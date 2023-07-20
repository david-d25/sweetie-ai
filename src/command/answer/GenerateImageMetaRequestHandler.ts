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
        if (request.args.length == 0) {
            response.metaRequestErrors.push("generateImage не получил текст запроса");
            return;
        }
        const prompt = request.args[0];
        let url;
        try {
            url = await this.context.imageGenerationService.generateImage(prompt);
        } catch (e: any) {
            response.metaRequestErrors.push(`Не получилось создать картинку с текстом "${prompt}" (${e.message})`);
            return;
        }
        let attachments;
        try {
            attachments = await this.context.vkMessagesService.uploadPhotoAttachmentsByUrl(message.peerId, [url]);
        } catch (e: any) {
            response.metaRequestErrors.push(`Не получилось прикрепить картинку (${e.message})`);
            return;
        }
        response.attachments.push(...attachments);
    }
}