import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";

export default class ContextCommand extends Command {
    constructor(context: Context) {
        super(context);
    }

    getCommandShortUsage(): string {
        return '/sweet context (текст)';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'context';
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService } = this.context;
        if (rawArguments.length == 0)
            await vkMessagesService.send(message.peerId, this.getUsage());

        const subCommand = rawArguments.split(" ")[0];
        const text = rawArguments.slice(subCommand.length).trim();
        const chatSettings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);

        if (subCommand == "show") {
            const chatContext = chatSettings.context;
            if (chatContext == null)
                await vkMessagesService.send(message.peerId, "Контекст не задан.");
            await vkMessagesService.send(message.peerId, `Контекст:\n${chatContext}`);
        } else if (subCommand == "set") {
            if (text.length == 0)
                await vkMessagesService.send(message.peerId, this.getUsage());
            await chatSettingsService.setContext(message.peerId, text);
            await vkMessagesService.send(message.peerId, `Сохранил контекст (${text.length} символов).`);
        } else if (subCommand == "add") {
            if (text.length == 0)
                await vkMessagesService.send(message.peerId, this.getUsage());
            const chatContext = chatSettings.context || "";
            const newChatContext = chatContext + "\n" + text;
            await chatSettingsService.setContext(message.peerId, newChatContext);
            await vkMessagesService.send(message.peerId, `Сохранил контекст (${chatContext.length} -> ${newChatContext.length} символов).`);
        } else if (subCommand == "forget") {
            await chatSettingsService.setContext(message.peerId, null);
            await vkMessagesService.send(message.peerId, "Удалил контекст.");
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private getUsage(): string {
        let usage = `Как пользоваться: \n`;
        usage += `/sweet context show\n`;
        usage += `/sweet context set (текст)\n`;
        usage += `/sweet context add (текст)\n`;
        usage += `/sweet context forget\n`;
        return usage;
    }
}