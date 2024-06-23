import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";
import {version} from "../main";

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
        const { vkMessagesService, botService, userPermissionsService } = this.context;
        let response = '';
        response += `Sweetie AI v${version}\n\n`;
        response += `Вот что можно сделать:\n`
        botService.getCommandHandlers()
            .filter(command => !command.chatAdminOnly(message.peerId) && !command.appCeoOnly())
            .forEach(command => {
                response += `${command.getCommandShortUsage()}\n`
            });
        if (await userPermissionsService.isUserPrivileged(message.peerId, message.fromId)) {
            response += `\nАдминские команды:\n`
            botService.getCommandHandlers()
                .filter(command => command.chatAdminOnly(message.peerId) && !command.appCeoOnly())
                .forEach(command => {
                    response += `${command.getCommandShortUsage()}\n`
                });
            response += `/sweet enable`;
        }
        await vkMessagesService.send(message.peerId, response);
    }
}