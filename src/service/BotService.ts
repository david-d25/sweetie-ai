import {VK} from "vk-io";
import VkMessagesService, {VkMessage} from "service/VkMessagesService";
import ConfigService from "service/ConfigService";
import ChatSettingsService from "service/ChatSettingsService";
import {Context} from "../Context";
import {getRandomBotEnablingPhrase} from "../template/BotEnablingPhrases";
import Command from "../command/Command";

export default class BotService {
    private static readonly TRIGGER_WORD = "/sweet";

    private vk!: VK;
    private messagesService!: VkMessagesService;
    private config!: ConfigService;
    private chatSettingsService!: ChatSettingsService;
    private commandHandlers: Command[] = [];

    constructor (private context: Context) {
        context.onReady(this.start.bind(this));
    }

    addCommandHandlers(...command: Command[]) {
        this.commandHandlers.push(...command);
    }

    getCommandHandlers(): Command[] {
        return this.commandHandlers;
    }

    private start() {
        this.vk = this.context.vk;
        this.messagesService = this.context.vkMessagesService;
        this.config = this.context.configService;
        this.chatSettingsService = this.context.chatSettingsService;
        this.action().then(_ => {});
    }

    private async action() {
        try {
            const messages = this.messagesService.popSinglePeerIdMessages();
            for (const message of messages) {
                if (message.text?.trim().startsWith(BotService.TRIGGER_WORD))
                    await this.processCommandMessage(message);
            }
            setTimeout(() => this.action(), 1000);
        } catch (e) {
            console.error("Something bad happened, will retry soon\n", e);
            setTimeout(() => this.action(), 10000);
        }
    }

    private async processCommandMessage(message: VkMessage) {
        let chatSettings = await this.context.chatSettingsService.getSettingsOrCreateDefault(message.peerId);

        const text = message.text!.trim();
        const refinedCommandString = text.slice(BotService.TRIGGER_WORD.length).trim();
        const commandName = refinedCommandString.split(" ")[0];

        if (commandName == "enable") {
            if (chatSettings.botEnabled) {
                await this.messagesService.send(message.peerId, "Бот уже включен");
                return;
            }
            await this.chatSettingsService.setBotEnabled(message.peerId, true);
            console.log(`[${message.peerId}] Bot enabled`);
            await this.messagesService.send(message.peerId, getRandomBotEnablingPhrase());
            return;
        }

        if (!chatSettings.botEnabled) {
            console.log(`[${message.peerId}] Bot is disabled, ignoring command`);
            return;
        }

        console.log(`[${message.peerId}] Got command message: ${message.text}`);

        const argumentsRaw = refinedCommandString.slice(commandName.length).trim();
        for (const command of this.commandHandlers) {
            if (command.canYouHandleThisCommand(commandName, message)) {
                await command.handle(commandName, argumentsRaw, message)
                return;
            }
        }

        await this.handleUnknownCommand(message);
    }

    private async handleUnknownCommand(message: VkMessage) {
        await this.messagesService.send(message.peerId, "Не знаю такую команду. Пиши /sweet help");
    }
}