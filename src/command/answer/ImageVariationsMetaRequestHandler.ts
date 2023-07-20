import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";
import {PhotoAttachment} from "vk-io";
import axios from "axios";
import sharp from "sharp";

export default class ImageVariationsMetaRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName === "generateImageVariations";
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (request.args.length < 1) {
            response.metaRequestErrors.push("Сладенький неправильно вызвал команду 'generateImageVariations'");
            return;
        }
        const photoId = +request.args[0];
        const numVariations = request.args.length >= 2 ? +request.args[1] : 4;
        if (message.attachments.length <= photoId) {
            response.metaRequestErrors.push(`Сладенький попытался найти вложение с номером ${photoId}, но в сообщении только ${message.attachments.length} вложений`);
            return;
        }
        const attachment = message.attachments[photoId];
        if (attachment.type != "photo") {
            response.metaRequestErrors.push(`Сладенький попытался открыть картинку с номером ${photoId}, но это оказалась не картинка (type = ${attachment.type})`);
            return;
        }
        const photoAttachment = attachment as PhotoAttachment;
        try {
            const axiosResponse = await axios({
                url: photoAttachment.largeSizeUrl,
                responseType: 'arraybuffer'
            });
            const buffer = await sharp(Buffer.from(axiosResponse.data))
                .toColorspace('srgb')
                .raw()
                .toBuffer({ resolveWithObject: true })
                .then(({ data, info }) => {
                    const { width, height, channels } = info;
                    let newWidth = width;
                    let newHeight = height;
                    let leftOffset = 0;
                    let topOffset = 0;
                    if (width > height) {
                        // noinspection JSSuspiciousNameCombination
                        newWidth = height;
                        leftOffset = Math.round((width - height) / 2);
                    }
                    else if (height > width) {
                        // noinspection JSSuspiciousNameCombination
                        newHeight = width;
                        topOffset = Math.round((height - width) / 2);
                    }
                    return sharp(data, { raw: { width, height, channels } })
                        .extract({
                            left: leftOffset,
                            top: topOffset,
                            width: newWidth,
                            height: newHeight
                        })
                        .png()
                        .toBuffer()
                })
            const result = await this.context.imageGenerationService.generateImageVariations(buffer, numVariations);
            const attachments = await this.context.vkMessagesService.uploadPhotoAttachmentsByUrl(message.peerId, result);
            response.attachments.push(...attachments);
        } catch (e: any) {
            console.log(`[${message.peerId}] Failed to generate image variations: ${e}`);
            response.metaRequestErrors.push(`Не получилось создать вариации картинки (${e.message})`);
        }
    }

}