import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";

export default class HelpCommand extends Command {
    constructor(context: Context) {
        super(context);
    }

    getCommandShortUsage(): string {
        return '/sweet help';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'help' || command === '';
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService } = this.context;
        let response = '';
        response += `Вот что можно сделать:\n`
        response += `/sweet help\n`
        response += `/sweet answer\n`
        response += `\n`
        response += `Настройки:\n`
        response += `/sweet context\n`
        response += `/sweet settings\n`
        response += `/sweet enable\n`
        response += `/sweet disable\n`
        await vkMessagesService.send(message.peerId, response);
    }
}