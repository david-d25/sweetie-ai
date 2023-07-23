import {MetaRequestHandler} from "./MetaRequestHandler";
import {VkMessage} from "../../service/VkMessagesService";
import {MetaRequest} from "./MetaRequest";
import {ResponseMessage} from "./ResponseMessage";
import {Context} from "../../Context";
import {PhotoAttachment} from "vk-io";
import {hexToRgb} from "../../util/ColorUtil";
import axios from "axios";
import sharp from "sharp";

export default class EditImageMetaRequestHandler implements MetaRequestHandler {
    constructor(private context: Context) {}

    canYouHandleThis(requestName: string): boolean {
        return requestName === "editImage";
    }

    async handle(message: VkMessage, request: MetaRequest, response: ResponseMessage): Promise<void> {
        if (request.args.length < 3) {
            response.metaRequestErrors.push("Сладенький неправильно вызвал команду 'editImage'");
            return;
        }
        const photoId = +request.args[0];
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
        const color = request.args[1];
        const maskColorRgb = hexToRgb(color);
        if (maskColorRgb == null) {
            response.metaRequestErrors.push(`Сладенький вызвал команду 'editImage' с неправильным hex-цветом маски (${color})`);
            return;
        }
        let prompt = request.args[2];
        prompt = prompt.slice(1, prompt.length - 1); // remove quotes
        try {
            const axiosResponse = await axios({
                url: photoAttachment.largeSizeUrl,
                responseType: 'arraybuffer'
            });
            const resizedImageBuffer = await sharp(Buffer.from(axiosResponse.data))
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
                        .ensureAlpha()
                        .raw()
                        .toBuffer({ resolveWithObject: true })
                });
            console.log(`[${message.peerId}] Applying mask...`);
            const { width, height, channels } = resizedImageBuffer.info;
            for (let i = 0; i < width * height * channels; i += channels) {
                const r = resizedImageBuffer.data[i];
                const g = resizedImageBuffer.data[i + 1];
                const b = resizedImageBuffer.data[i + 2];
                if (Math.abs(r - maskColorRgb.r) < 25
                    && Math.abs(g - maskColorRgb.g) < 25
                    && Math.abs(b - maskColorRgb.b) < 25
                ) {
                    resizedImageBuffer.data[i + 3] = 0;
                }
            }
            const imageBuffer = await sharp(resizedImageBuffer.data, { raw: { width, height, channels } }).png().toBuffer();
            console.log(`[${message.peerId}] Sending image editing request...`)
            const result = await this.context.imageGenerationService.editImage(imageBuffer, prompt);
            const attachments = await this.context.vkMessagesService.uploadPhotoAttachments(message.peerId, [result]);
            response.attachments.push(...attachments);
        } catch (e: any) {
            console.log(`[${message.peerId}] Failed to generate image variations: ${e}`);
            response.metaRequestErrors.push(`Не получилось отредактировать картинку (${e.message})`);
        }
    }
}