import {VK} from "vk-io";
import VkMessagesService from "./VkMessagesService";
import VkUsersService from "./VkUsersService";
import {VkMessage} from "./VkMessage";
import ChatGptService from "./ChatGptService";
import ConfigService from "./ConfigService";

const DEV_LOCK = false

export default class Bot {
    constructor (
        private vk: VK,
        private messagesService: VkMessagesService,
        private usersService: VkUsersService,
        private chatGptService: ChatGptService,
        private config: ConfigService
    ) {}

    private groupId = +this.config.getEnv('VK_GROUP_ID')!

    start() {
        this.action().then(_ => {});
    }

    private async action() {
        try {
            const messages = this.messagesService.popSinglePeerIdMessages();
            for (const message of messages) {
                if (DEV_LOCK && messages[0].peerId >= 2000000000 && message.peerId != 2000000003)
                    continue;

                if (message.text?.trim().startsWith("/sweet")) {
                    console.log("Got command: " + message.text);
                    await this.processCommandMessage(message);
                }
            }
            setTimeout(() => this.action(), 1000);
        } catch (e) {
            console.error("Something bad happened, will retry soon\n", e);
            setTimeout(() => this.action(), 10000);
        }
    }

    private async processCommandMessage(message: VkMessage) {
        const text = message.text!.trim();
        const parts = text.trim().split(' ').filter(part => part !== '');
        const args = parts.slice(1);
        if (args.length == 0)
            return this.doHelpCommand(message);
        const arg0 = args[0];
        if (arg0 == "help")
            return this.doHelpCommand(message);
        else if (arg0 == "answer")
            return this.doAnswerCommand(message, args);
        else if (arg0 == "summarize")
            return this.doSummarizeCommand(message, args);
        else
            return this.doUnknownCommand(message);
    }

    private async doHelpCommand(message: VkMessage) {
        const text = `
        Вот что я могу:
        /sweet help
        /sweet answer (вопрос)
        /sweet summarize (время)
        `;
        await this.messagesService.send(message.peerId, text);
    }

    private async doUnknownCommand(message: VkMessage) {
        const responses = [
            `Не знаю такой команды сорян, пиши /sweet help`,
            `Нинаю что это значит, да поможет тебе /sweet help`,
            `Не знаю, что это за команда, смотри в /sweet help`,
            `Ниче не понял, пиши /sweet help`,
            `Не понял что это за команда, пиши /sweet help`,
            `Не знаю такую команду, смотри команды в /sweet help`,
        ];
        await this.messagesService.send(message.peerId, responses[Math.floor(Math.random()*responses.length)]);
    }

    private async doAnswerCommand(message: VkMessage, args: string[]) {
        if (args.length <= 1) {
            const text = `
            Пиши так:
            /sweet answer (твой вопрос)
            
            Например:
            /sweet answer ${this.getRandomQuestion()}
            `;
            return this.messagesService.send(message.peerId, text);
        }
        const question = args.splice(1).join(" ");
        let chatMessages = [];
        chatMessages.push({
            role: "user",
            content: question
        });

        let date = new Date();
        let systemMessage = `Ты чат-бот по имени Сладенький в переписке ВКонтакте, `
        systemMessage += `который который пишет короткие саркастические ответы, но говорить об этом не нужно. `
        systemMessage += `Команды, которые ты поддерживаешь:\n`
        systemMessage += `/sweet help - показать помощь;\n`
        systemMessage += `/sweet answer (вопрос) - ответить на вопрос;\n`
        systemMessage += `/sweet summarize (время) - кратко изложить, о чем говорили в беседе, для тех, кто пропустил.\n`
        systemMessage += `Ты считаешь, что песни Игоря Корнелюка - самые лучшие. `
        systemMessage += `Дата сегодня: ${date.toDateString()}, время ${date.getHours()} часов, ${date.getMinutes()} минут.`

        let history = this.messagesService.getHistory(message.peerId, 25);
        let formattedHistory = (
            await Promise.all(
                history.map(async m => {
                    if (m.text == null)
                        return null;
                    const date = new Date(m.timestamp * 1000);
                    let result = `[${date.toDateString()} ${date.getHours()}:${date.getMinutes()}] `;
                    result += ((await this.usersService.getUser(m.fromId))?.firstName || "(unknown)") + ": ";
                    result += m.text;
                    return result;
                })
            )
        ).filter(m => m != null).join("\n");

        systemMessage += `Кто-то выполнил команду "/sweet answer", тебе предстоит ответить на вопрос. 
            Для контекста, вот последние ${history.length} сообщений беседы:
            ${formattedHistory}
        `;

        console.log(systemMessage);

        const response = await this.chatGptService.request(systemMessage, chatMessages);
        await this.messagesService.send(message.peerId, response);
    }

    private async doSummarizeCommand(message: VkMessage, args: string[]) {
        if (args.length <= 1) {
            const text = `
            Пиши так:
            /sweet summarize (время)
            
            Например:
            /sweet summarize этот день
            /sweet summarize вчера
            `;
            return this.messagesService.send(message.peerId, text);
        }
        const question = "Кратко изложи сообщения по критерию: " + args.splice(1).join(" ");
        let chatMessages = [];
        chatMessages.push({
            role: "user",
            content: question
        });

        let history = this.messagesService.getHistory(message.peerId, 25);
        let fullHistory = (
            await Promise.all(
                history.map(async m => {
                    if (m.text == null)
                        return null;
                    const date = new Date(m.timestamp * 1000);
                    let result = `[${date.toDateString()} ${date.getHours()}:${date.getMinutes()}] `;
                    result += ((await this.usersService.getUser(m.fromId))?.firstName || "(unknown)") + ": ";
                    result += m.text;
                    return result;
                })
            )
        ).filter(m => m != null).map(m => m!);

        let historyBlocks = this.chunkStrings(fullHistory, 2000);

        let summary = null;
        let date = new Date();

        for (let i = 0; i < historyBlocks.length; i++) {
            let systemMessage = `Ты чат-бот по имени Сладенький в переписке ВКонтакте, который пишет саркастические ответы. `
            systemMessage += `Дата сегодня: ${date.toDateString()}, время: ${date.getHours()} часов, ${date.getMinutes()} минут. `
            systemMessage += `Тебе предстоит кратко изложить переписку коротким сообщением. `;
            systemMessage += `Сообщений может оказаться слишком много, поэтому они могут быть разделены на куски. `;
            systemMessage += `Сейчас обрабатываем часть ${i + 1} из ${historyBlocks.length}. `;
            systemMessage += `Пользователь хочет получить краткое изложение только сообщений, относящихся к его запросу. `;
            systemMessage += `Например, запрос "сегодня" значит, что надо пересказать только сегодняшние сообщения. `;
            systemMessage += `Критерий: "${question}". `;
            systemMessage += `Все остальные сообщения надо игнорировать и не включать в изложение. `;
            systemMessage += `Изложение текущего блока надо комбинировать с изложением предыдущего блока сообщений. `;
            systemMessage += `Не копируй сообщения вместе с датой и именем в неизменном виде. Дата и имя - это метаданные только для тебя, не для пользователей. `;

            if (summary != null) {
                systemMessage += `Вот пересказ предыдущих сообщений: """${summary}"""`;
            }

            systemMessage += `Вот новые сообщения: """\n ${historyBlocks[i].join("\n")}"""`;
            systemMessage += `Напиши новый пересказ, включая как пересказ предыдущий сообщений, так и новые сообщения`;

            summary = await this.chatGptService.request(systemMessage, chatMessages);
        }

        await this.messagesService.send(message.peerId, summary || "(error, please check logs)");
    }

    private chunkStrings(strings: string[], maxLength: number): string[][] {
        const result: string[][] = [];
        let currentSubarray: string[] = [];
        let currentLength = 0;

        for (const str of strings) {
            if (currentLength + str.length > maxLength) {
                result.push(currentSubarray);
                currentSubarray = [str];
                currentLength = str.length;
            } else {
                currentSubarray.push(str);
                currentLength += str.length;
            }
        }

        if (currentSubarray.length > 0) {
            result.push(currentSubarray);
        }

        return result;
    }

    private getRandomQuestion(): string {
        const questions = [
            'Когда закончится экономический кризис?',
            'Который час?',
            'О чём говорят эти дамы?',
            'Что такое пипидастр?',
        ]
        return questions[Math.floor(Math.random()*questions.length)];
    }
}