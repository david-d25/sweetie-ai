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

export default class AnswerCommand extends Command {
    private metaRequestHandlers: MetaRequestHandler[];

    constructor(context: Context) {
        super(context);
        this.metaRequestHandlers = [
            new GenerateImageMetaRequestHandler(context),
            new EditImageMetaRequestHandler(context),
            new ImageVariationsMetaRequestHandler(context)
        ];
    }

    getCommandShortUsage(): string {
        return '/sweet answer (текст)';
    }

    canYouHandleThisCommand(command: string, message: VkMessage): boolean {
        return command === 'answer';
    }

    async handle(command: string, rawArguments: string, message: VkMessage): Promise<void> {
        const { vkMessagesService, chatSettingsService, chatGptService, vkUsersService } = this.context;
        if (rawArguments.length == 0)
            return this.sendUsage(message.peerId);
        let response: ResponseMessage = { text: "", attachments: [], metaRequestErrors: [] };
        const chatSettings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);
        let maxMessagesSize = chatSettings.gptMaxInputTokens - (chatSettings.context?.length || 0) - AnswerCommandTemplates.getBaseTemplateSize();
        let formattedHistory = await this.getFormattedHistory(message.peerId, 300, maxMessagesSize);
        let chatMessages = [];
        const userMessageDate = new Date(message.timestamp * 1000);
        const user = await vkUsersService.getUser(+message.fromId)!;
        const displayName = user ? (user.firstName + " " + user.lastName) : "(unknown)";
        const userMessage = this.formatVkMessage(userMessageDate, message, displayName);
        chatMessages.push({
            role: "user",
            content: userMessage
        });
        console.log(`[${message.peerId}] Will pass ${formattedHistory.length} messages for context`);
        let systemMessage = AnswerCommandTemplates.generateSystemMessage(
            new Date(),
            chatSettings.context,
            formattedHistory
        );
        console.log(`[${message.peerId}] Length of system message: ${systemMessage.length}`);
        console.log(`[${message.peerId}] Requesting response from GPT...`);
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
            response.text = "Сладенький не смог ответить:\n" + e.message;
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
        if (response.metaRequestErrors.length > 2) {
            response.text += `\n\n---\n`;
            response.text += response.metaRequestErrors.map((it, i) => `${i + 1}. ${it}`).join('\n');
        } else if (response.metaRequestErrors.length == 1) {
            response.text += `\n\n---\n`;
            response.text += response.metaRequestErrors[0];
        }
        console.log(`[${message.peerId}] Sending response...`);
        try {
            await vkMessagesService.send(message.peerId, response.text, response.attachments);
        } catch (e) {
            console.error(e);
            await vkMessagesService.send(message.peerId, "(Что-то сломалось, проверьте логи)");
        }
    }

    private async handleMetaRequests(requests: MetaRequest[], message: VkMessage, responseMessage: ResponseMessage): Promise<void> {
        for (let i in requests) {
            const request = requests[i];
            console.log(`[${message.peerId}] Handling meta-request ${+i+1}/${requests.length}: ${request.functionName}`);

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
                console.log(`[${message.peerId}] Handler threw exception: ${e}`);
            }
        }
        responseMessage.text = responseMessage.text.replaceAll(/@call:(\w+)\((.*?)\)\n?/g, "");
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

    private async getFormattedHistory(peerId: number, maxMessages: number, maxTotalSize: number): Promise<string[]> {
        console.log(`[${peerId}] Retrieving history...`);
        let history = await this.context.vkMessagesService.getHistory(peerId, maxMessages);
        const userIds = new Set(history.map(m => +m.fromId));
        const userById = await this.context.vkUsersService.getUsers([...userIds]);

        let formattedHistory = (
            await Promise.all(
                history.map(async msg => {
                    if (msg.text == null)
                        return null;
                    const user = userById.get(+msg.fromId)!;
                    const displayName = user ? (user.firstName + " " + user.lastName) : "(unknown)";
                    const date = new Date(msg.timestamp * 1000);
                    return this.formatVkMessage(date, msg, displayName);
                })
            )
        ).filter(m => m != null) as string[];

        let currentMessagesSize = formattedHistory.join('\n').length;
        while (formattedHistory.length > 0 && currentMessagesSize > maxTotalSize) {
            currentMessagesSize -= formattedHistory[0]!.length + 1; // +1 for \n
            formattedHistory.shift();
        }
        return formattedHistory;
    }

    private async sendUsage(peerId: number): Promise<void> {
        const text = `Пиши так:\n`
            + `/sweet answer (вопрос)\n`
            + `\n`
            + `Например:\n`
            + `/sweet answer Когда закончится экономический кризис?\n`;
        return this.context.vkMessagesService.send(peerId, text);
    }

    private formatVkMessage(date: Date, message: VkMessage, displayName: string): string {
        let result = `[${date.getDate().toString()}/${(date.getMonth() + 1).toString()}/${date.getFullYear().toString()} ${date.getHours()}:${date.getMinutes()}] `;
        result += displayName + ": ";
        result += message.text;
        return result;
    }
}

type MetaRequestParsingResult = {
    request: MetaRequest;
    raw: string;
    parsingError: boolean;
}