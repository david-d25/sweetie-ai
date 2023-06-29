import {VK} from "vk-io";
import VkMessagesService, {VkMessage} from "service/VkMessagesService";
import VkUsersService from "service/VkUsersService";
import ChatGptService from "service/ChatGptService";
import ConfigService from "service/ConfigService";
import ChatSettingsService from "service/ChatSettingsService";
import {response as helpResponse} from "./template/HelpCommandTemplates"
import * as AnswerCommandTemplates from "./template/AnswerCommandTemplates";
import ImageGenerationService from "service/ImageGenerationService";

export default class Bot {
    constructor (
        private vk: VK,
        private messagesService: VkMessagesService,
        private usersService: VkUsersService,
        private chatGptService: ChatGptService,
        private config: ConfigService,
        private chatSettingsService: ChatSettingsService,
        private imageGenerationService: ImageGenerationService
    ) {}

    // private groupId = +this.config.getEnv('VK_GROUP_ID')!
    private devLock = this.config.getEnv('DEV_LOCK') == 'true'

    start() {
        this.action().then(_ => {});
    }

    private async action() {
        try {
            const messages = this.messagesService.popSinglePeerIdMessages();
            for (const message of messages) {
                // DevLock: ignore all messages except from personal accounts and in group
                if (this.devLock && messages[0].peerId >= 2000000000 && message.peerId != 2000000003)
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
        const command = args[0];
        if (command == "help" || command == "")
            return this.doHelpCommand(message);
        else if (command == "answer")
            return this.doAnswerCommand(message, args);
        else if (command == "summarize")
            return this.doSummarizeCommand(message, args);
        else if (command == "context")
            return this.doContextCommand(message, args);
        else if (command == "settings")
            return this.doSettingsCommand(message, args);
        else
            return this.doUnknownCommand(message);
    }

    private async doHelpCommand(message: VkMessage) {
        await this.messagesService.send(message.peerId, helpResponse);
    }

    private async doUnknownCommand(message: VkMessage) {
        await this.messagesService.send(message.peerId, "Не знаю такую команду. Пиши /sweet help");
    }

    private async doAnswerCommand(message: VkMessage, args: string[]) {
        if (args.length <= 1) {
            const text = `
            Пиши так:
            /sweet answer (вопрос)
            
            Например:
            /sweet answer ${this.getRandomQuestion()}
            `;
            return this.messagesService.send(message.peerId, text);
        }
        const chatSettings = await this.chatSettingsService.getSettings(message.peerId);
        const question = args.splice(1).join(" ");
        let chatMessages = [];
        chatMessages.push({
            role: "user",
            content: question
        });

        console.log(`[${message.peerId}] Retrieving history...`);
        let history = await this.messagesService.getHistory(message.peerId, 300);
        const userIds = new Set(history.map(m => +m.fromId));
        const userById = await this.usersService.getUsers([...userIds]);
        let formattedHistory = (
            await Promise.all(
                history.map(async m => {
                    if (m.text == null)
                        return null;
                    const user = userById.get(+m.fromId)!;
                    const displayName = user ? (user.firstName + " " + user.lastName) : "(unknown)";
                    const date = new Date(m.timestamp * 1000);
                    let result = `[${date.getDate().toString()}/${(date.getMonth() + 1).toString()}/${date.getFullYear().toString()} ${date.getHours()}:${date.getMinutes()}] `;
                    result += displayName + ": ";
                    result += m.text;
                    return result;
                })
            )
        ).filter(m => m != null) as string[];
        let maxMessagesSize = chatSettings.gptMaxInputTokens - (chatSettings.context?.length || 0) - AnswerCommandTemplates.getBaseTemplateSize();
        let currentMessagesSize = formattedHistory.join('\n').length;
        while (currentMessagesSize > maxMessagesSize) {
            currentMessagesSize -= formattedHistory[0]!.length + 1; // +1 for \n
            formattedHistory.shift();
        }

        console.log(`[${message.peerId}] Will pass ${formattedHistory.length} messages for context`);

        let systemMessage = AnswerCommandTemplates.generateSystemMessage(
            new Date(),
            chatSettings.context,
            formattedHistory
        );

        console.log(`[${message.peerId}] Length of system message: ${systemMessage.length}`);

        // console.log("System message: " + systemMessage.replaceAll("\n", "\\n"));

        console.log(`[${message.peerId}] Requesting response from GPT...`);
        let response = await this.chatGptService.request(
            systemMessage,
            chatMessages,
            chatSettings.gptMaxOutputTokens,
            chatSettings.gptTemperature,
            chatSettings.gptTopP,
            chatSettings.gptFrequencyPenalty,
            chatSettings.gptPresencePenalty
        );

        const imageRequests = [...response.matchAll(/{@imgreq:(.*?)}/g)].map(item => item[1]);
        const imageUrls = [];

        console.log(`[${message.peerId}] Got GPT response with ${imageRequests.length} image generation requests`);

        // console.log("Raw message: " + response.replaceAll("\n", "\\n"));

        let errors = false;
        for (let i in imageRequests) {
            const imageRequest = imageRequests[i];
            console.log(`[${message.peerId}] Requesting image generation ${+i+1}/${imageRequests.length}: ${imageRequest.replaceAll("\n", "\\n")}`);
            const url = await this.imageGenerationService.request(imageRequest)
            if (url != null)
                imageUrls.push(url);
            else
                errors = true;
        }

        response = response.replaceAll(/{@imgreq:(.*?)}/g, "");
        if (errors) {
            response += "\n\n(некоторые картинки не удалось сгенерировать)";
        }

        console.log(`[${message.peerId}] Sending response...`);
        try {
            await this.messagesService.send(message.peerId, response, imageUrls);
        } catch (e) {
            console.error(e);
            await this.messagesService.send(message.peerId, "(что-то сломалось, проверьте логи)");
        }
    }

    private async doSummarizeCommand(message: VkMessage, args: string[]) {
        let messagesLimit = 250;

        if (args.length <= 1) {
            let usage = `Пиши так:\n`;
            usage += `/sweet summarize (время)\n`;
            usage += `Например:\n`;
            usage += `/sweet summarize сегодня\n`;
            usage += `/sweet summarize вчера\n`;
            usage += `\n`;
            usage += `Обычно бот читает последние ${messagesLimit} сообщений. Чтобы расширить этот лимит, можно написать так:\n`;
            usage += `/sweet summarize 2000\n`;
            return this.messagesService.send(message.peerId, usage);
        }
        let criteria = args.splice(1).join(" ");

        if (!isNaN(+criteria)) {
            messagesLimit = +criteria;
            criteria = "(no criteria, use all messages)";
        }

        if (messagesLimit > 500) {
            await this.messagesService.send(message.peerId, `Начинаю читать ${messagesLimit} сообщений в переписке, это займёт некоторое время.`);
        }

        const chatSettings = await this.chatSettingsService.getSettings(message.peerId);
        const question = "Перескажи сообщения в соответствии с вопросом или критерием: " + criteria;
        let chatMessages = [];
        chatMessages.push({
            role: "user",
            content: question
        });

        let history = await this.messagesService.getHistory(message.peerId, messagesLimit);
        let fullHistory = (
            await Promise.all(
                history.map(async m => {
                    if (m.text == null)
                        return null;
                    const date = new Date(m.timestamp * 1000);
                    let result = `[${date.getDay()}/${date.getMonth()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}] `;
                    result += ((await this.usersService.getUser(m.fromId))?.firstName || "(unknown)") + ": ";
                    result += m.text;
                    return result;
                })
            )
        ).filter(m => m != null).map(m => m!);

        let maxMessagesSize = chatSettings.gptMaxInputTokens - 2400; // 2400 - base system message size approximation
        let historyBlocks = this.chunkStrings(fullHistory, maxMessagesSize);

        let summary = null;
        let date = new Date();

        for (let i = 0; i < historyBlocks.length; i++) {
            let systemMessage = `Ты саркастичный чат-бот по имени Сладенький в переписке ВКонтакте. `
            systemMessage += `Дата сегодня: ${date.toDateString()}, время: ${date.getHours()} часов, ${date.getMinutes()} минут. `
            systemMessage += `Тебе предстоит кратко изложить переписку коротким сообщением. `;
            systemMessage += `Сообщений может оказаться слишком много, поэтому они могут быть разделены на куски. `;
            systemMessage += `Сейчас обрабатываем часть ${i + 1} из ${historyBlocks.length}. `;
            systemMessage += `Пользователь хочет получить изложение только сообщений, относящихся к его запросу. `;
            systemMessage += `Например, запрос "сегодня" значит, что надо пересказать только сегодняшние сообщения. `;
            systemMessage += `Запрос "о чем был срач?" или "о чем спорили?" может означать, что надо просканировать историю сообщений и изложить, о чём вёлся спор. `;
            systemMessage += `Если не получается найти спор, то найди что-нибудь, что больше всего на него похоже и изложи это. `;
            systemMessage += `Критерий: """${criteria}""". `;
            systemMessage += `Все остальные сообщения надо игнорировать и не включать в изложение. `;
            systemMessage += `Изложение текущего блока надо комбинировать с изложением предыдущего блока сообщений. `;

            if (summary != null) {
                systemMessage += `Вот пересказ предыдущих сообщений:\n"""\n${summary}\n"""\n`;
            }

            systemMessage += `Каждое сообщение имеет дату и имя в начале. Не показывай эти данные пользователям, это метаданные и они только для тебя. `;

            systemMessage += `Вот последние сообщения:\n"""\n${historyBlocks[i].join("\n")}\n"""\n`;
            systemMessage += `Напиши новый пересказ, включая как пересказ предыдущий сообщений, так и новые сообщения. `;
            systemMessage += `Никогда не используй формат [id|Имя], вместо этого используй только имя человека.`;
            systemMessage += `Старайся использовать русские варианты имён, если с тобой говорят на русском. `;

            console.debug(systemMessage);

            summary = await this.chatGptService.request(
                systemMessage,
                chatMessages,
                chatSettings.gptMaxOutputTokens,
                chatSettings.gptTemperature,
                chatSettings.gptTopP,
                chatSettings.gptFrequencyPenalty,
                chatSettings.gptPresencePenalty
            );
        }

        await this.messagesService.send(message.peerId, summary || "(error, please check logs)");
    }

    private async doContextCommand(message: VkMessage, args: string[]) {
        let usage = `Как пользоваться: \n`;
        usage += `/sweet context set (текст)\n`;
        usage += `/sweet context forget\n`;
        if (args.length == 1)
            return this.messagesService.send(message.peerId, usage);
        if (args.length >= 2) {
            if (args[1] == "set") {
                if (args.length < 3)
                    return this.messagesService.send(message.peerId, usage);
                const context = args.slice(2).join(" ");
                await this.chatSettingsService.setContext(message.peerId, context);
                return this.messagesService.send(message.peerId, `Сохранил контекст (${context.length} символов).`);
            }
            if (args[1] == "forget") {
                await this.chatSettingsService.setContext(message.peerId, null);
                return this.messagesService.send(message.peerId, "Удалил контекст.");
            }
            return this.messagesService.send(message.peerId, usage);
        }
    }

    private async doSettingsCommand(message: VkMessage, args: string[]) {
        let usage = `Как пользоваться: \n`;
        usage += `/sweet settings list\n`;
        usage += `/sweet settings get (имя)\n`;
        usage += `/sweet settings set (имя) (значение)\n`;

        if (args.length == 1)
            return this.messagesService.send(message.peerId, usage);
        if (args.length >= 2) {
            if (args[1] == "list") {
                const settings = await this.chatSettingsService.getSettings(message.peerId);
                let response = ``;
                response += `max_output_tokens=${settings.gptMaxOutputTokens}\n`;
                response += `max_input_tokens=${settings.gptMaxInputTokens}\n`;
                response += `temperature=${settings.gptTemperature}\n`;
                response += `top_p=${settings.gptTopP}\n`;
                response += `frequency_penalty=${settings.gptFrequencyPenalty}\n`;
                response += `presence_penalty=${settings.gptPresencePenalty}\n`;
                return this.messagesService.send(message.peerId, response);
            }
            if (args[1] == "get") {
                if (args.length < 3)
                    return this.messagesService.send(message.peerId, usage);
                const settingName = args[2];
                const settings = await this.chatSettingsService.getSettings(message.peerId);
                let value = null;
                if (settingName == "max_output_tokens")
                    value = settings.gptMaxOutputTokens;
                if (settingName == "max_input_tokens")
                    value = settings.gptMaxInputTokens;
                if (settingName == "temperature")
                    value = settings.gptTemperature;
                if (settingName == "top_p")
                    value = settings.gptTopP;
                if (settingName == "frequency_penalty")
                    value = settings.gptFrequencyPenalty;
                if (settingName == "presence_penalty")
                    value = settings.gptPresencePenalty;

                return this.messagesService.send(message.peerId, `${settingName}=${value}`);
            }
            if (args[1] == "set") {
                if (args.length < 4)
                    return this.messagesService.send(message.peerId, usage);
                const settingName = args[2];
                const settingValue = args[3];
                if (settingName == "max_output_tokens") {
                    const value = parseInt(settingValue);
                    if (isNaN(value) || value < 1 || value > 2048)
                        return this.messagesService.send(message.peerId, `Это должно быть целое число от 1 до 2048`);
                    await this.chatSettingsService.setGptMaxOutputTokens(message.peerId, value);
                } else if (settingName == "max_input_tokens") {
                    const value = parseInt(settingValue);
                    if (isNaN(value) || value < 4096 || value > 16384)
                        return this.messagesService.send(message.peerId, `Это должно быть целое число от 4096 до 16384`);
                    await this.chatSettingsService.setGptMaxInputTokens(message.peerId, value);
                } else if (settingName == "temperature") {
                    const value = parseFloat(settingValue);
                    if (isNaN(value) || value < 0 || value > 2)
                        return this.messagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                    await this.chatSettingsService.setGptTemperature(message.peerId, value);
                } else if (settingName == "top_p") {
                    const value = parseFloat(settingValue);
                    if (isNaN(value) || value < 0 || value > 1)
                        return this.messagesService.send(message.peerId, `Это должно быть число от 0 до 1`);
                    await this.chatSettingsService.setGptTopP(message.peerId, value);
                } else if (settingName == "frequency_penalty") {
                    const value = parseFloat(settingValue);
                    if (isNaN(value) || value < 0 || value > 2)
                        return this.messagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                    await this.chatSettingsService.setGptFrequencyPenalty(message.peerId, value);
                } else if (settingName == "presence_penalty") {
                    const value = parseFloat(settingValue);
                    if (isNaN(value) || value < 0 || value > 2)
                        return this.messagesService.send(message.peerId, `Это должно быть число от 0 до 2`);
                    await this.chatSettingsService.setGptPresencePenalty(message.peerId, value);
                } else {
                    return this.messagesService.send(message.peerId, `Нет такого параметра`);
                }

                return this.messagesService.send(message.peerId, `${settingName}=${settingValue}`);
            }
            return this.messagesService.send(message.peerId, usage);
        }
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