import {Context} from "../Context";
import {StickerAttachment} from "vk-io";
import axios from "axios";

type Size = 64 | 128 | 256 | 512;

export type VkStickerPack = {
    id: number;
    name: string;
    productId: number;
    firstStickerId: number;
    stickerCount: number;
    enabled: boolean;
}

export default class VkStickerPacksService {
    constructor(private context: Context) {}

    async getStickerImage(stickerId: number, size: Size = 512, withBackground: boolean = true): Promise<Buffer> {
        const cachedImage = await this.context.vkStickerPacksOrmService.getStickerImage(
            stickerId, size, withBackground
        );
        if (cachedImage) {
            return cachedImage;
        }
        const url = this.getStickerUrl(stickerId, size, withBackground);
        const result = await this.downloadImage(url);
        await this.context.vkStickerPacksOrmService.storeStickerImage(stickerId, size, withBackground, result);
        return result;
    }

    getStickerUrl(stickerId: number, size: Size = 512, withBackground: boolean = true) {
        return `https://vk.com/sticker/1-${stickerId}-${size}${withBackground ? 'b' : ''}`;
    }

    async imitateStickerAttachment(stickerId: number): Promise<StickerAttachment> {
        const sizes = [64, 128, 256, 512];
        return new StickerAttachment({
            api: this.context.vk.api,
            payload: {
                id: stickerId,
                product_id: (await this.context.vkStickerPacksOrmService.getByStickerId(stickerId))?.productId || -1,
                sticker_id: stickerId,
                images: sizes.map(size => {
                    return {
                        url: this.getStickerUrl(stickerId, size as Size, false),
                        width: size,
                        height: size
                    }
                }),
                images_with_background: sizes.map(size => {
                    return {
                        url: this.getStickerUrl(stickerId, size as Size, true),
                        width: size,
                        height: size
                    }
                })
            }
        });
    }

    private async downloadImage(url: string): Promise<Buffer> {
        return axios.get(url, { responseType: 'arraybuffer' }).then(res => Buffer.from(res.data));
    }
}