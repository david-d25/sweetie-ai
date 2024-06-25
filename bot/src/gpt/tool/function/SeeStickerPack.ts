import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";
import {Logger} from "../../../service/LoggingService";
import axios from "axios";

export default class SeeStickerPackFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        this.context.onReady(() => {
            this.logger = this.context.loggingService.getRootLogger().newSublogger('SeeStickerPackFunction');
        });
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const packId = args['pack_id'];
        const pack = await this.context.vkStickerPacksOrmService.getByProductId(packId);
        if (!pack) {
            this.logger.error(`Sticker pack ${packId} not found. Use 'list_sticker_packs' to see available packs.`);
            return "Sticker pack not found.";
        }
        const stickerIds = Array.from({length: pack.stickerCount}, (_, i) => pack.firstStickerId + i);
        this.logger.info(`Getting images for sticker pack ${packId} (${pack.name})`);
        const stickerImagePromises = await Promise.allSettled(stickerIds.map(stickerId => {
            return this.context.vkStickerPacksService.getStickerImage(stickerId, 256);
        }));
        const stickerImages = stickerImagePromises.map(promise => {
            if (promise.status === "fulfilled") {
                return promise.value;
            } else {
                return null;
            }
        });
        const stickers: { image: string, caption: string }[] = [];
        for (let i = 0; i < stickerIds.length; i++) {
            if (stickerImages[i]) {
                stickers.push({
                    image: stickerImages[i]!.toString('base64'),
                    caption: `id ${stickerIds[i]}`
                });
            }
        }
        this.logger.info(`Forming an image of ${stickerImages.length} stickers`);
        const stickerPackImage = await this.createStickerPackImage(stickers, 1024, 6);

        this.logger.info(`Appending a message with sticker pack image`);
        invocationContext.appendMessage({
            role: "user",
            content: [
                {
                    type: "text",
                    text: "[INTERNAL] This is the sticker pack you requested. "
                }, {
                    type: "image_url",
                    image_url: {
                        url: "data:image/png;base64," + stickerPackImage.toString('base64')
                    }
                }
            ]
        })

        return "Sticker pack is shown in an internal message. Select a sticker to send.";
    }

    getDescription(): string {
        return "See all stickers in a sticker pack and their IDs. " +
            "Call this before 'send_sticker'. " +
            "Sticker pack will only be visible to you. ";
    }

    getName(): string {
        return "see_sticker_pack";
    }

    getParameters(): AssistantObject | null {
        return {
            type: "object",
            properties: {
                pack_id: {
                    type: "integer",
                    description: "ID of the sticker pack to show"
                }
            },
            required: ["pack_id"]
        };
    }

    private async createStickerPackImage(
        stickers: { image: string, caption: string }[],
        imageWidth: number,
        columns: number
    ): Promise<Buffer> {
        try {
            const config = this.context.configService.getAppConfig();
            const backendHost = config.backendUrl;
            const path = "/sticker-pack/create-image";
            const url = `${backendHost}${path}`;
            const response = await axios.post(url, {
                stickers,
                imageWidth,
                columns
            }, {
                responseType: 'arraybuffer',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'image/png'
                }
            });
            return response.data;
        } catch (e: any) {
            console.error(e);
            throw new Error("Failed to request sticker pack image from backend. Is it running?");
        }
    }
}