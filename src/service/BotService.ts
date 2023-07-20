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
    private taggingHandler: Command | null = null;
    private groupId!: number;

    constructor (private context: Context) {
        context.onReady(this.start.bind(this));
    }

    addCommandHandlers(...command: Command[]) {
        this.commandHandlers.push(...command);
    }

    setTaggingHandler(handler: Command) {
        this.taggingHandler = handler;
    }

    private start() {
        this.vk = this.context.vk;
        this.messagesService = this.context.vkMessagesService;
        this.config = this.context.configService;
        this.chatSettingsService = this.context.chatSettingsService;
        this.groupId = +this.context.configService.requireEnv('VK_GROUP_ID')!
        this.action().then(_ => {});
    }

    private async action() {
        try {
            const messages = this.messagesService.popSinglePeerIdMessages();
            for (const message of messages) {
                if (this.taggingHandler != null && this.isSweetieTaggedInThisMessage(message))
                    await this.taggingHandler.handle("", message.text!, message)
                else if (message.text?.trim().startsWith(BotService.TRIGGER_WORD))
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

    private isSweetieTaggedInThisMessage(message: VkMessage): boolean {
        if (message.text == null)
            return false;
        return new RegExp("\\[club220063847\\|.*]").test(message.text)
    }
}