import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";
import {getRandomBotDisablingPhrase} from "../template/BotDisablingPhrases";

export default class DisableCommand extends Command {
    constructor(context: Context) {
        super(context);
    }

    getCommandShortUsage(): string {
        return '/sweet disable';
    }

    chatAdminOnly(peerId: number): boolean {
        return true;
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'disable' || command === 'off';
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService } = this.context;
        await chatSettingsService.setBotEnabled(message.peerId, false);
        await vkMessagesService.send(message.peerId, getRandomBotDisablingPhrase());
    }
}