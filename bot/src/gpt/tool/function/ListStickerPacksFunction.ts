import AssistantFunction, {AssistantObject, InvocationContext} from "./AssistantFunction";
import {VkMessage} from "../../../service/VkMessagesService";
import {Context} from "../../../Context";
import {Logger} from "../../../service/LoggingService";

export default class ListStickerPacksFunction implements AssistantFunction {
    private logger!: Logger;

    constructor(private context: Context) {
        context.onReady(() => {
            this.logger = context.loggingService.getRootLogger().newSublogger("ListStickerPacksFunction");
        })
    }

    async call(args: any, message: VkMessage, invocationContext: InvocationContext): Promise<string> {
        const stickerPacks = await this.context.vkStickerPacksOrmService.getEnabled();
        const result = stickerPacks.map(pack => {
            return {
                packId: pack.productId,
                name: pack.name
            };
        });
        this.logger.info(`Listing ${result.length} sticker packs`);
        return "Available sticker packs:\n" + JSON.stringify(result) + "\n";
    }

    getDescription(): string {
        return "Shows a list of available sticker packs. " +
            "Use 'see_sticker_pack' to see all stickers in a pack and decide which one to send. " +
            "The sticker list is mainly for internal use and should not be shown to the user. ";
    }

    getName(): string {
        return "list_sticker_packs";
    }

    getParameters(): AssistantObject | null {
        return null;
    }
}