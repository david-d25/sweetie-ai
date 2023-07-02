import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";
import * as AnswerCommandTemplates from "../template/AnswerCommandTemplates";
import {PhotoAttachment} from "vk-io";
import {hexToRgb} from "../util/ColorUtil";
import axios from "axios";
import sharp from "sharp";

export default class AnswerCommand extends Command {
    constructor(context: Context) {
        super(context);
    }

    getCommandShortUsage(): string {
        return '/sweetie answer (текст)';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'answer';
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService, chatGptService, vkUsersService, imageGenerationService } = this.context;
        if (rawArguments.length == 0) {
            const text = `
            Пиши так:
            /sweet answer (вопрос)
            
            Например:
            /sweet answer Когда закончится экономический кризис?
            `;
            return vkMessagesService.send(message.peerId, text);
        }
        const chatSettings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        const question = rawArguments;
        let chatMessages = [];
        chatMessages.push({
            role: "user",
            content: question
        });

        console.log(`[${message.peerId}] Retrieving history...`);
        let history = await vkMessagesService.getHistory(message.peerId, 300);
        const userIds = new Set(history.map(m => +m.fromId));
        const userById = await vkUsersService.getUsers([...userIds]);

        let formattedHistory = (
            await Promise.all(
                history.map(async m => {
                    if (m.text == null)
                        return null;
                    const user = userById.get(+m.fromId)!;
                    const displayName = user ? (user.firstName + " " + user.lastName) : "(unknown)";
                    const date = new Date(m.timestamp * 1000);
                    let result = `[${date.getDate().toString()}/${(date.getMonth() + 1).toString()}/${date.getFullYear().toString()} ${date.getHours()}:${date.getMinutes()}] `;
                    result += displayName + ": ";
                    result += m.text;
                    return result;
                })
            )
        ).filter(m => m != null) as string[];

        let maxMessagesSize = chatSettings.gptMaxInputTokens - (chatSettings.context?.length || 0) - AnswerCommandTemplates.getBaseTemplateSize();
        let currentMessagesSize = formattedHistory.join('\n').length;
        while (currentMessagesSize > maxMessagesSize) {
            currentMessagesSize -= formattedHistory[0]!.length + 1; // +1 for \n
            formattedHistory.shift();
        }

        console.log(`[${message.peerId}] Will pass ${formattedHistory.length} messages for context`);

        let systemMessage = AnswerCommandTemplates.generateSystemMessage(
            new Date(),
            chatSettings.context,
            formattedHistory
        );

        console.log(`[${message.peerId}] Length of system message: ${systemMessage.length}`);

        console.log(`[${message.peerId}] Requesting response from GPT...`);
        let response = await chatGptService.request(
            systemMessage,
            chatMessages,
            chatSettings.gptMaxOutputTokens,
            chatSettings.gptTemperature,
            chatSettings.gptTopP,
            chatSettings.gptFrequencyPenalty,
            chatSettings.gptPresencePenalty
        );

        const attachedImagesUrls = [];
        const imageGenerationRequests = [...response.matchAll(/{@imggen:(.*?)}/g)].map(item => item[1]);
        const imageEditingRequests = [...response.matchAll(/{@imgedit:(.*?)}/g)].map(item => item[1]);

        console.log(`[${message.peerId}] Got GPT response (${imageGenerationRequests.length} imggen, ${imageEditingRequests.length} imgedit)`);

        let errors = false;
        for (let i in imageGenerationRequests) {
            const imageRequest = imageGenerationRequests[i];
            console.log(`[${message.peerId}] Requesting image generation ${+i+1}/${imageGenerationRequests.length}: ${imageRequest.replaceAll("\n", "\\n")}`);
            const url = await imageGenerationService.generateImage(imageRequest)
            if (url != null)
                attachedImagesUrls.push(url);
            else
                errors = true;
        }

        for (let i in imageEditingRequests) {
            const request = imageEditingRequests[i];
            console.log(`[${message.peerId}] Requesting image editing ${+i+1}/${imageEditingRequests.length}: ${request.replaceAll("\n", "\\n")}`);
            const split = request.split(",")
            if (split.length < 3) {
                console.log(`[${message.peerId}] Invalid image editing request: ${request}`)
                errors = true;
                continue;
            }
            const attachment = message.attachments[+split[0]];
            if (attachment == undefined) {
                console.log(`[${message.peerId}] Could not find attachment with local id '${split[0]}'`)
                errors = true;
                continue;
            }
            if (attachment.type != "photo") {
                console.log(`[${message.peerId}] Attachment with local id '${split[0]}' is not a photo`)
                errors = true;
                continue;
            }
            const photoAttachment = attachment as PhotoAttachment;
            const color = split[1];
            const maskColorRgb = hexToRgb(color);
            if (maskColorRgb == null) {
                console.log(`[${message.peerId}] Invalid color '${color}'`)
                errors = true;
                continue;
            }
            console.log(`[${message.peerId}] Using mask r=${maskColorRgb.r} g=${maskColorRgb.g} b=${maskColorRgb.b}`)
            let prompt = split.slice(2).join(",");
            prompt = prompt.slice(1, prompt.length - 1); // remove quotes

            console.log(`[${message.peerId}] Downloading image...`)
            await axios({
                url: photoAttachment.largeSizeUrl,
                responseType: 'arraybuffer'
            })
                .then(async response =>
                    sharp(Buffer.from(response.data))
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
                        })
                )
                .then(async ({ data, info }) => {
                    console.log(`[${message.peerId}] Applying mask...`)
                    const { width, height, channels } = info;
                    for (let i = 0; i < width * height * channels; i += channels) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        if (Math.abs(r - maskColorRgb.r) < 25
                            && Math.abs(g - maskColorRgb.g) < 25
                            && Math.abs(b - maskColorRgb.b) < 25
                        ) {
                            data[i + 3] = 0;
                        }
                    }
                    return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
                })
                .then(async buffer => {
                    // fs.writeFileSync("test.png", buffer);
                    console.log(`[${message.peerId}] Sending image editing request...`)
                    const result = await imageGenerationService.editImage(buffer, prompt);
                    if (result != null)
                        attachedImagesUrls.push(result);
                    else
                        errors = true;
                });
        }

        const originalResponse = response;
        response = response.replaceAll(/{@imggen:(.*?)}/g, "");
        response = response.replaceAll(/{@imgedit:(.*?)}/g, "");
        if (errors) {
            response += "\n\n(некоторые картинки не удалось сгенерировать)";
        }

        console.log(`[${message.peerId}] Sending response...`);
        try {
            await vkMessagesService.send(message.peerId, response, attachedImagesUrls);
        } catch (e) {
            console.error(e);
            await vkMessagesService.send(message.peerId, "(что-то сломалось, проверьте логи)");
        }
    }
}