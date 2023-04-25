import {VK} from "vk-io";
import VkMessagesService from "./VkMessagesService";
import VkUsersService from "./VkUsersService";
import {VkMessage} from "./VkMessage";
import ChatGptService from "./ChatGptService";
import ConfigService from "./ConfigService";

const MAX_MESSAGES_MEMORY = 32

export default class Bot {
    constructor (
        private vk: VK,
        private messagesService: VkMessagesService,
        private usersService: VkUsersService,
        private chatGptService: ChatGptService,
        private config: ConfigService
    ) {}

    private historyByPeerId: Map<number, VkMessage[]> = new Map();
    private groupId = +this.config.getEnv('VK_GROUP_ID')!

    start() {
        this.action().then(_ => {});
    }

    private async action() {
        try {
            const messages = this.messagesService.popSinglePeerIdMessages();
            //messages[0].peerId == 2000000003
            if (messages.length != 0) {
                const peerId = messages[0].peerId
                const newHistory = this.addToHistory(peerId, ...messages);
                const response = await this.getResponse(newHistory);
                console.log("OpenAI Response: " + response);
                if (messages.length != 0 && response != null && response.trim().length > 0) {
                    await this.messagesService.send(peerId, response);
                    this.addToHistory(peerId, {
                        id: -1,
                        peerId,
                        fromId: this.groupId,
                        timestamp: Date.now()/1000,
                        text: response
                    });
                }
            }
            setTimeout(() => this.action(), 5000 + Math.random() + 10000);
        } catch (e) {
            console.error("Something bad happened, will retry soon\n", e);
            setTimeout(() => this.action(), 10000);
        }
    }

    private async getResponse(messages: VkMessage[]): Promise<string | null> {
        if (messages.length == 0)
            return null;

        let unconditionalAnswerProbability = 0.01;
        let chatMessages = [];

        for (const message of messages) {
            const fromUser = await this.usersService.getUser(message.fromId);
            const fromUserName = fromUser ? fromUser.firstName : null;
            if (message.text != null && message.text.trim().length != 0) {
                chatMessages.push({
                    role: message.fromId == this.groupId ? "assistant" : "user",
                    name: fromUserName,
                    content: message.text
                });
            }
            if (message.peerId == message.fromId)
                unconditionalAnswerProbability = 1;
        }

        let systemMessage = `Ты чат-бот по имени Сладенький в беседе ВК, 
        который пишет короткие саркастические ответы, флиртует, иронизирует.\n`;
        
        if (Math.random() > unconditionalAnswerProbability) {
            systemMessage += `
            Сообщения направлены всем участникам.
            Песни Игоря Корнелюка - самые лучшие.
            Отвечай только тем, кто прямо обратился к тебе.
            Возможные обращения к тебе: club${this.groupId}, бот, сладкий, бот с огурцом на аве.
            Если сообщение не адресовано тебе, пиши "(null)".
            Если не уверен, пиши "(null)".
            В непонятной ситуации пиши "(null)".
            На общие вопросы для всех пиши "(null)".
            На неопределённые выражения отвечай "(null)".
            Если не понимаешь, что говорят, пиши "(null)".
            Если обращаются к другому человеку, пиши "(null)".
            Если нет явной просьбы, пиши "(null)".
            Если не понимаешь, о чем идет речь, пиши "(null)".
            `
        }

        if (chatMessages.length == 0)
            return null;

        const response = await this.chatGptService.request(systemMessage, chatMessages);
        return response == "(null)" ? null : response;
    }

    private addToHistory(peerId: number, ...newMessages: VkMessage[]): VkMessage[] {
        if (!this.historyByPeerId.has(peerId))
            this.historyByPeerId.set(peerId, []);
        const entry = this.historyByPeerId.get(peerId)!
        entry.push(...newMessages);
        while (entry.length > MAX_MESSAGES_MEMORY)
            entry.shift();
        return entry;
    }
}