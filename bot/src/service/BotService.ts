import VkMessagesService, {VkMessage} from "service/VkMessagesService";
import ChatSettingsService from "service/ChatSettingsService";
import {Context} from "../Context";
import {getRandomBotEnablingPhrase} from "../template/BotEnablingPhrases";
import Command from "../command/Command";
import ServiceError from "../ServiceError";
import {isChatId} from "../util/VkUtil";

export default class BotService {
    private static readonly TRIGGER_WORD = "/sweet";

    private messagesService!: VkMessagesService;
    private chatSettingsService!: ChatSettingsService;
    private commandHandlers: Command[] = [];
    private taggingHandler: Command | null = null;

    constructor(private context: Context) {
        context.onReady(this.start.bind(this));
    }

    addCommandHandlers(...command: Command[]) {
        this.commandHandlers.push(...command);
    }

    getCommandHandlers(): Command[] {
        return this.commandHandlers;
    }

    setTaggingHandler(handler: Command) {
        this.taggingHandler = handler;
    }

    private start() {
        this.messagesService = this.context.vkMessagesService;
        this.chatSettingsService = this.context.chatSettingsService;
        this.action().then(_ => {});
    }

    private async action() {
        try {
            const messages = this.messagesService.popSinglePeerIdMessages();
            for (const message of messages) {
                if (message.text?.trim().startsWith(BotService.TRIGGER_WORD)) {
                    await this.processCommandMessage(message);
                } else if (!isChatId(message.peerId)) {
                    await this.processTaggingMessage(message);
                } else if (this.taggingHandler != null && this.isSweetieTaggedInThisMessage(message)) {
                    await this.processTaggingMessage(message);
                }
            }
            setTimeout(() => this.action(), 1000);
        } catch (e) {
            console.error("Something bad happened, will retry soon\n", e);
            setTimeout(() => this.action(), 10000);
        }
    }

    private async processTaggingMessage(message: VkMessage) {
        let chatSettings = await this.context.chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        if (!chatSettings.botEnabled) {
            console.log(`[${message.peerId}] Bot is disabled, ignoring tagging`);
            return;
        }
        if (!message.text) {
            console.log(`[${message.peerId}] Message has no text, ignoring`);
            return;
        }

        console.log(`[${message.peerId}] Got tagging/private message: ${message.text}`);
        if (this.taggingHandler != null) {
            try {
                await this.taggingHandler.handle("", message.text!, message);
            } catch (e) {
                console.error(`[${message.peerId}] Error while handling tagging`, e);
                if (e instanceof ServiceError) {
                    await this.messagesService.send(message.peerId, `Не могу это сделать (${e.message})`);
                } else {
                    await this.messagesService.send(
                        message.peerId,
                        `В Сладеньком что-то сломалось и он не может ответить, попробуйте спросить позже.`
                    );
                }
            }
        }
    }

    private async processCommandMessage(message: VkMessage) {
        let chatSettings = await this.context.chatSettingsService.getSettingsOrCreateDefault(message.peerId);

        const text = message.text!.trim();
        const refinedCommandString = text.slice(BotService.TRIGGER_WORD.length).trim();
        const commandName = refinedCommandString.split(" ")[0];

        if (commandName == "enable" || commandName == "on") {
            const privileged = await this.context.userPermissionsService.isUserPrivileged(
                message.peerId,
                message.fromId
            );
            if (!privileged) {
                await this.messagesService.send(
                    message.peerId,
                    `Только админ может включить Сладенького`
                );
                return;
            }
            if (chatSettings.botEnabled) {
                await this.messagesService.send(message.peerId, "Бот уже включён");
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
                if (command.requiresPrivileges(message.peerId)) {
                    const privileged = await this.context.userPermissionsService.isUserPrivileged(
                        message.peerId,
                        message.fromId
                    );
                    if (!privileged) {
                        await this.messagesService.send(
                            message.peerId,
                            `Только админ может выполнить '${commandName}'`
                        );
                        return;
                    }
                }
                try {
                    await command.handle(commandName, argumentsRaw, message);
                } catch (e) {
                    console.error(`[${message.peerId}] Error while handling command '${commandName}'`, e);
                    if (e instanceof ServiceError) {
                        await this.messagesService.send(message.peerId, `Не могу это сделать (${e.message})`);
                    } else {
                        await this.messagesService.send(
                            message.peerId,
                            `В Сладеньком что-то сломалось и он не может ответить, попробуйте спросить позже.`
                        );
                    }
                }
                return;
            }
        }

        await this.handleUnknownCommand(message);
    }

    private async handleUnknownCommand(message: VkMessage) {
        await this.messagesService.send(message.peerId, "Не знаю эту команду. Пиши /sweet help");
    }

    private isSweetieTaggedInThisMessage(message: VkMessage): boolean {
        if (message.text == null)
            return false;
        return new RegExp(`\\[club${this.context.configService.getAppConfig().vkGroupId}\\|.*]`).test(message.text)
    }
}