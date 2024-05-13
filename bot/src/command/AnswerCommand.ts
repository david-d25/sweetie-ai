import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";
import * as AnswerCommandTemplates from "../template/AnswerCommandTemplate";
import {MetaRequest} from "./answer/MetaRequest";
import {ResponseMessage} from "./answer/ResponseMessage";
import {MetaRequestHandler} from "./answer/MetaRequestHandler";
import GenerateImageMetaRequestHandler from "./answer/GenerateImageMetaRequestHandler";
import EditImageMetaRequestHandler from "./answer/EditImageMetaRequestHandler";
import {ChatSettingsModel} from "../service/ChatSettingsService";
import GetUsersListMetaRequestHandler from "./answer/GetUsersListMetaRequestHandler";
import SendLaterMetaRequestHandler from "./answer/SendLaterMetaRequestHandler";
import WebSearchRequestHandler from "./answer/WebSearchRequestHandler";
import GetSearchResultContentMetaRequestHandler from "./answer/GetSearchResultContentMetaRequestHandler";
import {AudioMessageAttachment, PhotoAttachment} from "vk-io";
import ReviewMetaRequestHandler from "./answer/ReviewMetaRequestHandler";
import SendAsAudioMessageRequestHandler from "./answer/SendAsAudioMessageRequestHandler";

export default class AnswerCommand extends Command {
    private metaRequestHandlers: MetaRequestHandler[];

    constructor(context: Context) {
        super(context);
        this.metaRequestHandlers = [
            new GenerateImageMetaRequestHandler(context),
            new EditImageMetaRequestHandler(context),
            new GetUsersListMetaRequestHandler(context),
            new SendLaterMetaRequestHandler(context),
            new WebSearchRequestHandler(context),
            new GetSearchResultContentMetaRequestHandler(context),
            new SendAsAudioMessageRequestHandler(context),
            new ReviewMetaRequestHandler()
        ];
    }

    getCommandShortUsage(): string {
        return '/sweet answer (текст)';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'answer';
    }

    // TODO refactor
    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService, chatGptService } = this.context;
        const user = await this.context.vkUsersService.getUser(message.fromId);
        if (user == null) {
            await vkMessagesService.send(message.peerId, "Сладенький не может ответить (не смог найти тебя в базе данных)");
            return;
        }
        if (user.credits <= 0) {
            await this.handleNotEnoughCredits(message);
            return;
        }

        let response = new ResponseMessage();
        const chatSettings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);

        let gptRequestIterations = 0;
        const maxGptRequestIterations = 6;
        do {
            const visionSupported = chatSettings.gptModel.includes("vision") || chatSettings.gptModel == "gpt-4-turbo" || chatSettings.gptModel == "gpt-4o";
            let chatMessages = await this.buildChatMessages(message, response.metaRequestResults, visionSupported);
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
                await vkMessagesService.indicateActivity(message.peerId, "typing");
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
            await this.context.vkUsersOrmService.addCredits(message.fromId, -1);
        } catch (e) {
            console.error(e);
            await vkMessagesService.send(message.peerId, "(Что-то сломалось, проверьте логи)");
        }
    }

    // TODO separate out and refactor
    private async handleNotEnoughCredits(message: VkMessage) {
        const { vkMessagesService, usagePlanService } = this.context;
        const secondsRequired = await usagePlanService.getTimeInSecondsRequiredToHaveCredits(message.fromId, 1);
        if (secondsRequired <= 0) {
            await vkMessagesService.send(message.peerId, `Слишком много сообщений, пожалуйста подожди 15 секунд`);
            return;
        }
        if (secondsRequired == Number.POSITIVE_INFINITY) {
            await vkMessagesService.send(message.peerId, `У [id${Math.abs(message.fromId)}|тебя] достигнут лимит по вычислениям, нужно пополнить`);
            return
        }
        if (secondsRequired < 60) {
            await vkMessagesService.send(
                message.peerId,
                `Слишком много сообщений, пожалуйста подожди ${secondsRequired} с.`
            );
            return;
        }
        if (secondsRequired < 60*60) { // minutes
            const minutesRequired = Math.ceil(secondsRequired/60);
            await vkMessagesService.send(
                message.peerId,
                `Слишком много сообщений, пожалуйста подожди ${minutesRequired} м.`
            );
            return;
        }
        if (secondsRequired < 60*60*24) { // hours
            const hoursRequired = Math.floor(secondsRequired/60/60);
            const minutesRequired = Math.ceil(secondsRequired/60) - hoursRequired*60;
            await vkMessagesService.send(
                message.peerId,
                `Слишком много сообщений, пожалуйста подожди ${hoursRequired} ч. ${minutesRequired} м.`
            );
            return;
        }
        const daysRequired = Math.floor(secondsRequired/60/60/24);
        const hoursRequired = Math.floor(secondsRequired/60/60) - daysRequired*24;
        const minutesRequired = Math.ceil(secondsRequired/60) - hoursRequired*60 - daysRequired*24*60;
        await vkMessagesService.send(
            message.peerId,
            `Слишком много сообщений, пожалуйста подожди ${daysRequired} д. ${hoursRequired} ч. ${minutesRequired} м.`
        );
        return;
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
        responseMessage.text = responseMessage.text.replaceAll(/@call:(\w+)\((.*?)\)\n?/gms, "");
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
    }

    private calculateMaxHistoryMessagesSize(
        chatSettings: ChatSettingsModel,
        chatMessages: { role: string, content: string | object }[]
    ): number {
        const { chatGptService } = this.context;
        const model = chatSettings.gptModel;
        const chatMessagesSize = chatMessages
            .map(it => chatGptService.estimateTokensCount(model, JSON.stringify(it.content)) + 20) // 20 for service tokens
            .reduce((a, b) => a + b, 0);
        const context = chatSettings.context || "";
        return chatSettings.gptMaxInputTokens
            - chatGptService.estimateTokensCount(model, AnswerCommandTemplates.generateSystemMessage(new Date(), context))
            - chatMessages.flatMap(it => it.content instanceof Array ? it.content : []).filter(it => it.type == "image_url").length * 765 // Took this number from online calculator, maybe I'll refactor it later
            - chatMessagesSize;
    }

    private async buildChatMessages(userMessage: VkMessage, metaRequestResults: string[], visionSupported: boolean): Promise<{
        role: string,
        content: string | object
    }[]> {
        const messageText = (await this.createFormattedChatLines([userMessage]))[0];
        const result = [];
        const imageAttachments = userMessage.attachments.filter(it => it.type === 'photo') as PhotoAttachment[];
        if (!visionSupported || imageAttachments.length == 0) {
            result.push({ role: 'user', content: messageText });
        } else {
            const content = [];
            content.push({ type: 'text', text: messageText });
            for (const attachment of imageAttachments) {
                content.push({ type: 'image_url', image_url: { url: attachment.largeSizeUrl } });
            }
            result.push({ role: 'user', content: content });
        }
        for (const it of metaRequestResults)
            result.push({ role: 'assistant', content: it });
        return result;
    }

    private extractMetaRequests(text: string): MetaRequestParsingResult[] {
        const regex = /@call:(\w+)\((.*?)\)/gms;
        const result = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            const functionName = match[1];
            const rawArgs = match[2].replaceAll('\n', "\\n");
            try {
                const args = JSON.parse('[' + rawArgs + ']');
                result.push({ request: { functionName, args }, raw: match[0], parsingError: false });
            } catch (error) {
                console.error(error);
                result.push({ request: { functionName, args: [] }, raw: match[0], parsingError: true });
            }
        }
        return result;
    }

    private async prependFormattedHistory(
        peerId: number,
        chatMessages: { role: string, content: string | object }[],
        maxMessages: number,
        maxTotalSize: number,
        chatSettings: ChatSettingsModel
    ): Promise<number> {
        const { chatGptService } = this.context;
        console.log(`[${peerId}] Retrieving history...`);
        let history = await this.context.vkMessagesService.getDatabaseHistory(peerId, maxMessages);
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

    private async createFormattedChatLines(history: VkMessage[], forwardDepth: number = 0): Promise<string[]> {
        const result = [];
        for (const message of history) {
            const user = await this.context.vkUsersService.getUser(+message.fromId);
            const displayName = user ? (user.firstNameCached + " " + user.lastNameCached) : "(unknown)";
            const date = new Date(message.timestamp * 1000);
            let formattedMessage = this.formatVkMessage(date, message, displayName, forwardDepth) + "\n";
            formattedMessage += (
                await this.createFormattedChatLines(message.forwardedMessages, forwardDepth + 1)
            ).join("");
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
            if (attachment.type == "audio_message") {
                const audioMessage = attachment as AudioMessageAttachment
                result += ` [${attachment.type}, transcript="${audioMessage.transcript?.replaceAll('"', '\\"')}"]`;
            } else {
                result += ` [${attachment.type}, id=${i}]`;
            }
        }
        return result;
    }
}

type MetaRequestParsingResult = {
    request: MetaRequest;
    raw: string;
    parsingError: boolean;
}