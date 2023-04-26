import {VK} from "vk-io";
import VkMessagesService from "./VkMessagesService";
import VkUsersService from "./VkUsersService";
import {VkMessage} from "./VkMessage";
import ChatGptService from "./ChatGptService";
import ConfigService from "./ConfigService";

const MAX_MESSAGES_MEMORY = 32
const DEV_LOCK = false

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
            if (messages.length != 0 && (!DEV_LOCK || messages[0].peerId == 2000000003 || messages[0].peerId < 2000000000)) {
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

        let systemMessage = `Ты чат-бот по имени Сладенький в большой переписке ВКонтакте,
        который очень редко пишет короткие саркастические ответы, флиртует и иронизирует. Песни Игоря Корнелюка - самые лучшие.`;

        if (Math.random() > unconditionalAnswerProbability) {
            systemMessage += `
            Сообщения рассылаются всем участникам.
            Отвечай только тем, кто непосредственно обратился к тебе.
            Задача - отвечать только в том случае, если можно ответить с сарказмом, во всех остальных случаях
            ожидается ответ "(null)".
            Если сообщение не адресовано тебе, пиши "(null)".
            В любой неоднозначной ситуации пиши "(null)".
            На общие вопросы для всех пиши "(null)".
            На неопределённые выражения пиши "(null)".
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