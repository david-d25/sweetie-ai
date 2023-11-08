import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";
import * as AnswerCommandTemplates from "../template/AnswerCommandTemplates";
import {MetaRequest} from "./answer/MetaRequest";
import {ResponseMessage} from "./answer/ResponseMessage";
import {MetaRequestHandler} from "./answer/MetaRequestHandler";
import GenerateImageMetaRequestHandler from "./answer/GenerateImageMetaRequestHandler";
import EditImageMetaRequestHandler from "./answer/EditImageMetaRequestHandler";
import ImageVariationsMetaRequestHandler from "./answer/ImageVariationsMetaRequestHandler";
import {ChatSettingsModel} from "../service/ChatSettingsService";
import GetUsersListMetaRequestHandler from "./answer/GetUsersListMetaRequestHandler";
import DrawStatisticsMetaRequestHandler from "./answer/DrawStatisticsMetaRequestHandler";
import SendLaterMetaRequestHandler from "./answer/SendLaterMetaRequestHandler";
import WebSearchRequestHandler from "./answer/WebSearchRequestHandler";
import GetSearchResultContentMetaRequestHandler from "./answer/GetSearchResultContentMetaRequestHandler";
import {VkUser} from "../service/VkUsersService";

export default class AnswerCommand extends Command {
    private metaRequestHandlers: MetaRequestHandler[];

    constructor(context: Context) {
        super(context);
        this.metaRequestHandlers = [
            new GenerateImageMetaRequestHandler(context),
            new EditImageMetaRequestHandler(context),
            new ImageVariationsMetaRequestHandler(context),
            new GetUsersListMetaRequestHandler(context),
            new DrawStatisticsMetaRequestHandler(context),
            new SendLaterMetaRequestHandler(context),
            new WebSearchRequestHandler(context),
            new GetSearchResultContentMetaRequestHandler(context),
        ];
    }

    getCommandShortUsage(): string {
        return '/sweet answer (текст)';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'answer';
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService, chatGptService } = this.context;
        if (rawArguments.length == 0)
            return this.sendUsage(message.peerId);

        let response = new ResponseMessage();
        const chatSettings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        const userMessage = (await this.createFormattedChatLines([message]))[0];

        let gptRequestIterations = 0;
        const maxGptRequestIterations = 5;
        do {
            let chatMessages = this.buildChatMessages(userMessage, response.metaRequestResults);
            response.metaRequestResults = [];
            let maxMessagesSize = this.calculateMaxHistoryMessagesSize(chatSettings, chatMessages);
            const addedMessages = await this.prependFormattedHistory(message.peerId, chatMessages, 250, maxMessagesSize, chatSettings);
            console.log(`[${message.peerId}] Will pass last ${addedMessages} chat messages`);

            let systemMessage = AnswerCommandTemplates.generateSystemMessage(new Date(), chatSettings.context);
            const messagesSizeTokens = chatGptService.estimateTokensCount(chatSettings.gptModel, JSON.stringify(chatMessages));
            const systemMessageSizeTokens = chatGptService.estimateTokensCount(chatSettings.gptModel, systemMessage);
            console.log(`[${message.peerId}] Length of messages is ${messagesSizeTokens} tokens`);
            console.log(`[${message.peerId}] Length of system message is ${systemMessageSizeTokens} tokens`);
            console.log(`[${message.peerId}] Sending request to GPT...`);
            try {
                response.text = await chatGptService.request(
                    systemMessage,
                    chatMessages,
                    chatSettings.gptModel,
                    chatSettings.gptMaxOutputTokens,
                    chatSettings.gptTemperature,
                    chatSettings.gptTopP,
                    chatSettings.gptFrequencyPenalty,
                    chatSettings.gptPresencePenalty
                );
            } catch (e: any) {
                response.text = `Сладенький не может ответить (${e.message})`;
            }
            const metaRequests = this.extractMetaRequests(response.text).map(result => {
                if (result.parsingError) {
                    console.log(`[${message.peerId}] Parsing error: ${result.raw}`);
                    return null;
                } else {
                    return result.request;
                }
            }).filter(request => request != null) as MetaRequest[];
            console.log(`[${message.peerId}] Got GPT response (length ${response.text.length}, ${metaRequests.length} meta-requests)`);
            await this.handleMetaRequests(metaRequests, message, response);
            if (response.metaRequestResults.length != 0)
                console.log(`[${message.peerId}] Response contains ${response.metaRequestResults.length} meta-request results, will repeat request`);
            gptRequestIterations++;
        } while (response.metaRequestResults.length != 0 && gptRequestIterations < maxGptRequestIterations);
        this.addMetaRequestErrorsToResponse(response);
        console.log(`[${message.peerId}] Sending response...`);
        try {
            await vkMessagesService.send(message.peerId, response.text, response.attachments);
        } catch (e) {
            console.error(e);
            await vkMessagesService.send(message.peerId, "(Что-то сломалось, проверьте логи)");
        }
    }

    private addMetaRequestErrorsToResponse(response: ResponseMessage) {
        if (response.metaRequestErrors.length > 2) {
            response.text += `\n\n---\n`;
            response.text += response.metaRequestErrors.map((it, i) => `${i + 1}. ${it}`).join('\n');
        } else if (response.metaRequestErrors.length == 1) {
            response.text += `\n\n---\n`;
            response.text += response.metaRequestErrors[0];
        }
    }

    private async handleMetaRequests(requests: MetaRequest[], message: VkMessage, responseMessage: ResponseMessage): Promise<void> {
        for (let i in requests) {
            const request = requests[i];
            console.log(`[${message.peerId}] Handling meta-request ${+i+1}/${requests.length}: ${request.functionName}, args: ${JSON.stringify(request.args)}`);

            const handler = this.metaRequestHandlers.find(it => it.canYouHandleThis(request.functionName));
            if (handler == null) {
                responseMessage.metaRequestErrors.push(`Сладенький попытался выполнить неизвестную команду '${request.functionName}'`);
                console.log(`[${message.peerId}] Unknown meta-request function: ${request.functionName}`);
                continue;
            }
            try {
                await handler.handle(message, request, responseMessage);
            } catch (e) {
                responseMessage.metaRequestErrors.push(`Сладенький вызвал команду '${request.functionName}', но она провалилась без объяснения причин`);
                console.log(`[${message.peerId}] Handler threw exception:`);
                console.error(e);
            }
        }
        responseMessage.text = responseMessage.text.replaceAll(/@call:(\w+)\((.*?)\)\n?/g, "");
    }

    private calculateMaxHistoryMessagesSize(
        chatSettings: ChatSettingsModel,
        chatMessages: { role: string, content: string }[]
    ): number {
        const { chatGptService } = this.context;
        const model = chatSettings.gptModel;
        const chatMessagesSize = chatMessages
            .map(it => chatGptService.estimateTokensCount(model, it.content) + 20) // 20 for service tokens
            .reduce((a, b) => a + b, 0);
        const context = chatSettings.context || "";
        return chatSettings.gptMaxInputTokens
            - chatGptService.estimateTokensCount(model, AnswerCommandTemplates.generateSystemMessage(new Date(), context))
            - chatMessagesSize;
    }

    private buildChatMessages(userMessage: string, metaRequestResults: string[]): { role: string, content: string }[] {
        const result = [];
        result.push({ role: 'user', content: userMessage });
        for (const it of metaRequestResults)
            result.push({ role: 'assistant', content: it });
        return result;
    }

    private extractMetaRequests(text: string): MetaRequestParsingResult[] {
        const regex = /@call:(\w+)\((.*?)\)/g;
        const result = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            const functionName = match[1];
            const rawArgs = match[2];
            try {
                const args = JSON.parse('[' + rawArgs + ']');
                result.push({ request: { functionName, args }, raw: match[0], parsingError: false });
            } catch (error) {
                result.push({ request: { functionName, args: [] }, raw: match[0], parsingError: true });
            }
        }
        return result;
    }

    private async prependFormattedHistory(
        peerId: number,
        chatMessages: { role: string, content: string }[],
        maxMessages: number,
        maxTotalSize: number,
        chatSettings: ChatSettingsModel
    ): Promise<number> {
        const { chatGptService } = this.context;
        console.log(`[${peerId}] Retrieving history...`);
        let history = await this.context.vkMessagesService.getHistory(peerId, maxMessages);
        const contentPrefix = 'Last chat messages:\n"""\n';
        const contentPostfix = '\n"""\n';
        const model = chatSettings.gptModel;
        const maxMessagesSize = maxTotalSize
            - chatGptService.estimateTokensCount(model, contentPrefix)
            - chatGptService.estimateTokensCount(model, contentPostfix)
            - 20; // 20 for service tokens

        let formattedChatLines = await this.createFormattedChatLines(history);

        let currentMessagesSize = chatGptService.estimateTokensCount(model, formattedChatLines.join());
        while (formattedChatLines.length > 0 && currentMessagesSize > maxMessagesSize) {
            currentMessagesSize -= chatGptService.estimateTokensCount(model, formattedChatLines[0]!);
            formattedChatLines.shift();
        }
        const messagesString = formattedChatLines.join("");
        chatMessages.unshift({
            role: 'assistant',
            content: contentPrefix + messagesString + contentPostfix
        });
        return formattedChatLines.length;
    }

    private async sendUsage(peerId: number): Promise<void> {
        const text = `Пиши так:\n`
            + `/sweet answer (вопрос)\n`
            + `\n`
            + `Например:\n`
            + `/sweet answer Когда закончится экономический кризис?\n`;
        await this.context.vkMessagesService.send(peerId, text);
    }

    private async createFormattedChatLines(history: VkMessage[], forwardDepth: number = 0): Promise<string[]> {
        const result = [];
        for (const message of history) {
            const user = await this.context.vkUsersService.getUser(+message.fromId);
            const displayName = user ? (user.firstName + " " + user.lastName) : "(unknown)";
            const date = new Date(message.timestamp * 1000);
            let formattedMessage = this.formatVkMessage(date, message, displayName, forwardDepth) + "\n";
            formattedMessage += (await this.createFormattedChatLines(message.forwardedMessages, forwardDepth + 1)).join("");
            result.push(formattedMessage);
        }
        return result;
    }

    private formatVkMessage(date: Date, message: VkMessage, displayName: string, forwardDepth: number = 0): string {
        let result = ``;
        for (let i = 0; i < forwardDepth; i++) {
            result += `>>`;
        }
        result += `[${date.getDate().toString()}/${(date.getMonth() + 1).toString()}/${date.getFullYear().toString()} ${date.getHours()}:${date.getMinutes()}]`;
        result += `[id${message.fromId}] `;
        result += displayName + ": ";
        result += message.text;
        for (const [i, attachment] of message.attachments.entries()) {
            result += ` [attachment:${attachment.type}, id=${i}]`;
        }
        return result;
    }
}

type MetaRequestParsingResult = {
    request: MetaRequest;
    raw: string;
    parsingError: boolean;
}