import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";
import {ChatSettingsModel} from "../service/ChatSettingsService";

export default class ContextCommand extends Command {
    constructor(context: Context) {
        super(context);
    }

    requiresPrivileges(peerId: number): boolean {
        return true;
    }

    getCommandShortUsage(): string {
        return '/sweet context (...)';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'context';
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService } = this.context;

        const subCommand = rawArguments.split(" ")[0];
        const text = rawArguments.slice(subCommand.length).trim();
        const chatSettings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);

        if (!subCommand) {
            await this.handleShow(message.peerId, chatSettings);
        } else if (subCommand == "show") {
            await this.handleShow(message.peerId, chatSettings);
        } else if (subCommand == "set") {
            await this.handleSet(message.peerId, chatSettings, text);
        } else if (subCommand == "forget") {
            await this.handleForget(message.peerId);
        } else if (subCommand == "add") {
            await this.handleAdd(message.peerId, chatSettings, text);
        } else if (subCommand == "replace") {
            await this.handleReplace(message.peerId, chatSettings, text);
        } else if (subCommand == "remove") {
            await this.handleRemove(message.peerId, chatSettings, text);
        } else {
            await vkMessagesService.send(message.peerId, this.getUsage());
        }
    }

    private async handleShow(peerId: number, chatSettings: ChatSettingsModel) {
        const { vkMessagesService } = this.context;
        const chatContext = chatSettings.context;
        if (chatContext == null || chatContext.length == 0) {
            await vkMessagesService.send(peerId, "Нет инструкций");
            return;
        }
        const contextLines = chatContext?.split("\n").reduce((acc, line, index) => {
            return acc + `${index + 1}. ${line}\n`;
        }, "");
        await vkMessagesService.send(peerId, `Инструкции:\n${contextLines}`);
    }

    private async handleSet(peerId: number, chatSettings: ChatSettingsModel, text: string) {
        const { vkMessagesService, chatSettingsService } = this.context;
        if (text.length == 0)
            await vkMessagesService.send(peerId, this.getUsage());
        await chatSettingsService.setContext(peerId, text);
        const tokensCount = this.context.chatGptService.estimateTokensCount(chatSettings.gptModel, text);
        await vkMessagesService.send(peerId, `Запомнил инструкции (${tokensCount} токенов)`);
    }

    private async handleForget(peerId: number) {
        const { vkMessagesService, chatSettingsService } = this.context;
        await chatSettingsService.setContext(peerId, null);
        await vkMessagesService.send(peerId, "Удалил инструкции");
    }

    private async handleAdd(peerId: number, chatSettings: ChatSettingsModel, text: string) {
        const { vkMessagesService, chatSettingsService } = this.context;
        if (text.length == 0)
            await vkMessagesService.send(peerId, this.getUsage());
        const chatContext = chatSettings.context || "";
        const newChatContext = (chatContext + "\n" + text).trim();
        await chatSettingsService.setContext(peerId, newChatContext);
        const tokensCount = this.context.chatGptService.estimateTokensCount(chatSettings.gptModel, newChatContext);
        await vkMessagesService.send(peerId, `Запомнил инструкции (${tokensCount} токенов)`);
    }

    private async handleReplace(peerId: number, chatSettings: ChatSettingsModel, text: string) {
        const { vkMessagesService, chatSettingsService } = this.context;
        if (text.length == 0)
            await vkMessagesService.send(peerId, this.getUsage());
        const args = text.split(" ");
        if (args.length < 2) {
            await vkMessagesService.send(peerId, this.getUsage());
            return;
        }
        const selectedLine = parseInt(args[0]);
        if (isNaN(selectedLine)) {
            await vkMessagesService.send(peerId, this.getUsage());
            return;
        }
        const chatContext = chatSettings.context || "";
        const lines = chatContext.split("\n");
        if (selectedLine < 1 || selectedLine > lines.length) {
            await vkMessagesService.send(peerId, `Нет строки с номером ${selectedLine}`);
            return;
        }
        lines[selectedLine - 1] = args.slice(1).join(" ");
        const newChatContext = lines.join("\n");
        await chatSettingsService.setContext(peerId, newChatContext);
        const tokensCount = this.context.chatGptService.estimateTokensCount(chatSettings.gptModel, newChatContext);
        await vkMessagesService.send(peerId, `Сохранил инструкции (${tokensCount} токенов)`);
    }

    private async handleRemove(peerId: number, chatSettings: ChatSettingsModel, text: string) {
        const { vkMessagesService, chatSettingsService } = this.context;
        if (text.length == 0)
            await vkMessagesService.send(peerId, this.getUsage());
        const chatContext = chatSettings.context || "";
        const lines = chatContext.split("\n");
        let selectedLine = parseInt(text);
        if (text == "last") {
            selectedLine = lines.length;
        } else if (isNaN(selectedLine)) {
            await vkMessagesService.send(peerId, "Нужен номер строки, который надо удалить");
            return;
        }
        if (selectedLine < 1 || selectedLine > lines.length) {
            await vkMessagesService.send(peerId, `Нет строки с номером ${selectedLine}`);
            return;
        }
        lines.splice(selectedLine - 1, 1);
        const newChatContext = lines.join("\n");
        await chatSettingsService.setContext(peerId, newChatContext);
        await vkMessagesService.send(
            peerId,
            `Удалил строку ${selectedLine}`
        );
    }

    private getUsage(): string {
        let usage = `Команды:\n`;
        usage += `/sweet context\n`;
        usage += `/sweet context help\n`;
        usage += `/sweet context show\n`;
        usage += `/sweet context set (текст)\n`;
        usage += `/sweet context forget\n`;
        usage += `/sweet context add (текст)\n`;
        usage += `/sweet context replace (номер) (текст)\n`;
        usage += `/sweet context remove (номер)\n`;
        return usage;
    }
}