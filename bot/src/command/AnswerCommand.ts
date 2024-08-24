import Command from "./Command";
import {Context} from "../Context";
import {VkMessage} from "../service/VkMessagesService";
import * as AnswerCommandTemplates from "../template/AnswerCommandTemplate";
import {Attachment, AudioMessageAttachment, ExternalAttachment, PhotoAttachment, StickerAttachment} from "vk-io";
import GptChatHistoryBuilder from "../gpt/GptChatHistoryBuilder";
import {
    CompletionMessageDto,
    CompletionResponse,
    CompletionToolCallDto,
    CompletionUserMessageContentItemDto, CompletionUserMessageDto
} from "../service/ChatGptService";
import AssistantFunction, {AssistantFunctionParameter, InvocationContext} from "../gpt/tool/function/AssistantFunction";
import {Logger} from "../service/LoggingService";
import GetUsersListFunction from "../gpt/tool/function/GetUsersListFunction";
import SendLaterFunction from "../gpt/tool/function/SendLaterFunction";
import StopFunction from "../gpt/tool/function/StopFunction";
import SpeakFunction from "../gpt/tool/function/SpeakFunction";
import WebSearchFunction from "../gpt/tool/function/WebSearchFunction";
import ReadWebSearchResultFunction from "../gpt/tool/function/ReadWebSearchResultFunction";
import SendStickerFunction from "../gpt/tool/function/SendStickerFunction";
import ListStickerPacksFunction from "../gpt/tool/function/ListStickerPacksFunction";
import SeeStickerPackFunction from "../gpt/tool/function/SeeStickerPack";
import ImageDrawFunction from "../gpt/tool/function/ImageDrawFunction";
import ImageRemoveBackgroundFunction from "../gpt/tool/function/ImageRemoveBackgroundFunction";
import ImageSearchAndReplaceFunction from "../gpt/tool/function/ImageSearchAndReplaceFunction";
import ImageSketchFunction from "../gpt/tool/function/ImageSketchFunction";
import ImageStructureFunction from "../gpt/tool/function/ImageStructureFunction";

export default class AnswerCommand extends Command {
    private assistantFunctions: AssistantFunction[];
    private logger!: Logger;

    constructor(context: Context) {
        super(context);
        this.logger = context.loggingService.getRootLogger().newSublogger("AnswerCommand");
        this.assistantFunctions = [
            new ImageDrawFunction(context),
            new ImageRemoveBackgroundFunction(context),
            new ImageSearchAndReplaceFunction(context),
            new ImageSketchFunction(context),
            new ImageStructureFunction(context),
            new GetUsersListFunction(context),
            new SendLaterFunction(context),
            new StopFunction(),
            new SpeakFunction(context),
            new WebSearchFunction(context),
            new ReadWebSearchResultFunction(context),
            new ListStickerPacksFunction(context),
            new SeeStickerPackFunction(context),
            new SendStickerFunction(context)
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
        const logger = this.logger.newSublogger(`peer_id:${message.peerId}`);

        const user = await this.context.vkUsersService.getUser(message.fromId);
        if (user == null) {
            await vkMessagesService.send(message.peerId, "Сладенький не может ответить (user not found)");
            return;
        }
        if (user.credits <= 0) {
            await this.handleNotEnoughCredits(message);
            return;
        }

        const chatSettings = await chatSettingsService.getSettingsOrCreateDefault(message.peerId);

        const modelName = chatSettings.gptModel;
        const visionSupported = modelName.includes("vision")
            || modelName.startsWith("gpt-4-turbo")
            || modelName.startsWith("gpt-4o")
            || modelName.startsWith("chatgpt-4o");

        let systemMessage = AnswerCommandTemplates.generateSystemMessage(new Date(), chatSettings.context);
        const functions = this.assistantFunctions.map(f => {
            return {
                name: f.getName(),
                description: f.getDescription(),
                parameters: f.getParameters() ?? undefined
            }
        });

        let builder = new GptChatHistoryBuilder(
            text => chatGptService.estimateTokensCount(chatSettings.gptModel, text)
        );
        builder.setTokenLimit(chatSettings.gptMaxInputTokens);
        builder.setSystemMessage(systemMessage);
        builder.setTools(functions.map(f => {
            return {
                "type": "function",
                "function": f
            }
        }));

        let vkHistory = await this.context.vkMessagesService.getStoredMessagesHistory(message.peerId, 128);

        for (const [index, historyItem] of vkHistory.entries()) {
            if (+historyItem.fromId == -this.context.configService.getAppConfig().vkGroupId) {
                builder.addSoftMessage({
                    "role": "assistant",
                    "content": await this.vkMessageToString(historyItem)
                });
                // Adding images and sticker as user so assistant can see them
                const imageAttachments = historyItem.attachments.filter(it => it.type === 'photo') as PhotoAttachment[];
                const stickerAttachments = historyItem.attachments.filter(
                    it => it.type === 'sticker'
                ) as StickerAttachment[];
                if (!visionSupported || (imageAttachments.length == 0 && stickerAttachments.length == 0))
                    continue;
                const imageContent: CompletionUserMessageContentItemDto[] = [{
                    type: 'text',
                    text: "[INTERNAL] This is the image(s) you sent in the previous message:"
                }];
                for (const attachment of imageAttachments) {
                    imageContent.push({ type: 'image_url', image_url: { url: attachment.largeSizeUrl! } });
                }
                builder.addSoftMessage({
                    "role": "user",
                    "content": imageContent
                });
                const stickerContent: CompletionUserMessageContentItemDto[] = [{
                    type: 'text',
                    text: "[INTERNAL] This is the sticker you sent in the previous message:"
                }];
                for (const attachment of stickerAttachments) {
                    stickerContent.push({
                        type: 'image_url',
                        image_url: {
                            url: attachment.imagesWithBackground[attachment.imagesWithBackground.length - 1].url
                        }
                    });
                }
                builder.addSoftMessage({
                    "role": "user",
                    "content": stickerContent
                });
            } else {
                const message: CompletionUserMessageDto = {
                    "role": "user",
                    "content": await this.createUserGptContent(historyItem, visionSupported)
                };
                if (index != vkHistory.length - 1) {
                    builder.addSoftMessage(message);
                } else {
                    builder.addHardMessage(message);
                }
            }
        }

        let maxRuns = 8;
        let runIndex = 0;
        let creditsCost = 1;
        let continuationMode = "auto";
        let lastResponse: CompletionResponse | null = null;
        const attachments: Attachment[] = [];
        do {
            let history = builder.build();
            try {
                await vkMessagesService.indicateActivity(message.peerId, "typing");

                logger.info(`Requesting GPT, passing ${history.length} messages and ${functions.length} functions`);
                lastResponse = await chatGptService.request(
                    history,
                    functions,
                    chatSettings.gptModel,
                    chatSettings.gptMaxOutputTokens,
                    chatSettings.gptTemperature,
                    chatSettings.gptTopP,
                    chatSettings.gptFrequencyPenalty,
                    chatSettings.gptPresencePenalty
                );
                builder.addHardMessage({
                    role: "assistant",
                    content: lastResponse.content,
                    tool_calls: lastResponse.toolCalls
                });
                {
                    const textLength = lastResponse.content?.length || 0;
                    const toolCallsLength = lastResponse.toolCalls?.length || 0;
                    logger.info(`GPT response text has length ${textLength} and ${toolCallsLength} tool calls`);
                }

                continuationMode = "auto";

                const messagesToAppend: CompletionMessageDto[] = [];
                const invocationContext: InvocationContext = {
                    addAttachment(value: Attachment): void {
                        attachments.push(value);
                    },
                    requestStop() {
                        continuationMode = "stop";
                    },
                    appendMessage(message: CompletionMessageDto) {
                        messagesToAppend.push(message);
                    },
                    chargeCredits(credits: number) {
                        creditsCost += credits;
                    },
                    lookupAttachment(id: number): Attachment | ExternalAttachment | null {
                        for (const message of vkHistory) {
                            for (const attachment of message.attachments) {
                                if ((attachment as any).id == id) {
                                    return attachment;
                                }
                            }
                        }
                        return null;
                    }
                }

                if (lastResponse.toolCalls?.length) {
                    logger.info(
                        'Handling tool calls: ' + lastResponse.toolCalls.map(it => it.function.name).join(', ')
                    );
                    await this.handleToolCalls(builder, lastResponse.toolCalls, invocationContext, message);
                }
                messagesToAppend.forEach(it => builder.addHardMessage(it));

                if (lastResponse.content && lastResponse.content.match(/<\|.*?\|>/g)) {
                    logger.warn("Assistant response contains <| or |> tags, re-asking GPT");
                    builder.addHardMessage({
                        role: "user",
                        content: "[SYSTEM MESSAGE] Your response contains text between `<|` and `|>`. " +
                            "Repeat your answer without these symbols. " +
                            "If you wanted to send an image or sticker, call functions."
                    });
                    continuationMode = "continue";
                }
            } catch (e: any) {
                console.error(e);
                continuationMode = "stop";
                creditsCost = 1;
                await vkMessagesService.send(message.peerId, `Сладенький не может ответить (${e.message})`);
            }

            runIndex++;
        } while (
            runIndex < maxRuns && (
                continuationMode == "auto" && !lastResponse?.content || continuationMode == "continue"
            )
        );

        if (lastResponse?.content || attachments.length != 0) {
            await vkMessagesService.send(
                message.peerId,
                this.sanitizeAssistantResponse(lastResponse?.content ?? ""),
                attachments
            );
            logger.info(`Message sent`);
        }
        await this.context.vkUsersOrmService.addCredits(message.fromId, -creditsCost);
        logger.info(`Answering finished, ${creditsCost} credits deducted`);
    }

    private sanitizeAssistantResponse(text: string) {
        // Removing Markdown
        text = text
            .replace(/([*_]{1,3})(\S.*?\S?)\1/g, '$2') // Styles
            .replace(/!\[(.*?)][\[(].*?[\])]/g, '') // Images
            .replace(/\[(.*?)]\([^\s)]+\s*(?:".*?")?\)/g, '$1') // URLs
            .replace(/\[(.*?)]\[[^\]]+]/g, '$1') // URLs
            .replace(/\n====+\n/g, '\n')
            .replace(/\n----+\n/g, '\n')
            .replace(/(#+\s*)(.*?)(\n|$)/g, '$2\n')
            .replace(/^\s*>+\s?/gm, '') // Quotes
        text = text
            .replaceAll("@all", "@???")
            .replaceAll("@online", "@??????")
        text = text.replace(/<\|.*?\|>/g, '');
        return text;
    }

    private async handleToolCalls(
        historyBuilder: GptChatHistoryBuilder,
        toolCalls: CompletionToolCallDto[],
        invocationContext: InvocationContext,
        message: VkMessage
    ) {
        await Promise.allSettled(toolCalls.map(async toolCall => {
            try {
                if (toolCall.type == "function") {
                    return await this.handleFunctionCall(historyBuilder, toolCall, invocationContext, message);
                } else {
                    historyBuilder.addHardMessage({
                        role: "tool",
                        content: `Unknown tool call type "${toolCall.type}"`,
                        tool_call_id: toolCall.id
                    })
                    invocationContext.requestStop();
                    return Promise.resolve();
                }
            } catch (e: any) {
                historyBuilder.addHardMessage({
                    role: "tool",
                    content: `Tool call failed: ${e.message}`,
                    tool_call_id: toolCall.id
                });
                this.logger.newSublogger(`peer_id:${message.peerId}`).error(`Tool call failed: ${e.message}`);
                console.error(e);
                return Promise.resolve();
            }
        }));
    }

    private async handleFunctionCall(
        historyBuilder: GptChatHistoryBuilder,
        functionCall: CompletionToolCallDto,
        invocationContext: InvocationContext,
        message: VkMessage
    ) {
        const assistantFunction = this.assistantFunctions.find(f => f.getName() == functionCall.function.name);
        if (!assistantFunction) {
            historyBuilder.addHardMessage({
                role: "tool",
                content: `Unknown function "${functionCall.function.name}"`,
                tool_call_id: functionCall.id
            });
            invocationContext.requestStop();
            return;
        }
        const args = JSON.parse(functionCall.function.arguments);
        if (assistantFunction.getParameters() != null) {
            this.validateAssistantFunctionArguments(
                args,
                assistantFunction.getParameters()!,
                assistantFunction.getName()
            );
        }
        const result = await assistantFunction.call(args, message, invocationContext);
        historyBuilder.addHardMessage({
            role: "tool",
            content: result,
            tool_call_id: functionCall.id
        });
    }

    private validateAssistantFunctionArguments(
        value: any,
        typeDescriptor: AssistantFunctionParameter,
        functionName: string,
        propertyPath: string[] = [],
        propertyIsOptional: boolean = false
    ) {
        const propertyPathString = propertyPath.length > 0 ? propertyPath.join('.') : 'root';
        if (propertyIsOptional && value == null) {
            return;
        }
        if (typeDescriptor.type == "object") {
            if (typeof value != "object") {
                throw new Error(`Expected object, got ${typeof value} at ${propertyPathString}`);
            }
            for (const [key, valueDescriptor] of Object.entries(typeDescriptor.properties)) {
                this.validateAssistantFunctionArguments(
                    value[key],
                    valueDescriptor,
                    functionName,
                    [...propertyPath, key],
                    typeDescriptor.required?.includes(key) == false
                );
            }
            if (typeDescriptor.required) {
                for (const key of typeDescriptor.required) {
                    if (!(key in value)) {
                        throw new Error(`Missing required key "${key}" at ${propertyPathString}`);
                    }
                }
            }
        } else if (typeDescriptor.type == "string") {
            if (typeDescriptor.enum && !typeDescriptor.enum.includes(value)) {
                throw new Error(`Expected one of ${typeDescriptor.enum.join(', ')} at ${propertyPathString}`);
            }
            if (typeof value != "string") {
                throw new Error(`Expected string, got ${typeof value} at ${propertyPathString}`);
            }
        } else if (typeDescriptor.type == "integer") {
            if (typeof value != "number") {
                throw new Error(`Expected number, got ${typeof value} at ${propertyPathString}`);
            }
            if (!Number.isInteger(value)) {
                throw new Error(`Expected integer, got ${value} at ${propertyPathString}`);
            }
        } else if (typeDescriptor.type == "boolean") {
            if (typeof value != "boolean") {
                throw new Error(`Expected boolean, got ${typeof value} at ${propertyPathString}`);
            }
        } else if (typeDescriptor.type == "number") {
            if (typeof value != "number") {
                throw new Error(`Expected number, got ${typeof value} at ${propertyPathString}`);
            }
        } else {
            throw new Error(`Unknown type '${(typeDescriptor as any).type}' at ${propertyPathString}`);
        }
    }

    private async createUserGptContent(
        message: VkMessage,
        visionSupported: boolean
    ): Promise<string | CompletionUserMessageContentItemDto[]> {
        const text = await this.vkMessageToString(message);
        const imageAttachments = message.attachments.filter(it => it.type === 'photo') as PhotoAttachment[];
        const stickerAttachments = message.attachments.filter(it => it.type === 'sticker') as StickerAttachment[];
        if (!visionSupported || (imageAttachments.length == 0 && stickerAttachments.length == 0))
            return text;
        const content: CompletionUserMessageContentItemDto[] = [];
        content.push({ type: 'text', text: text });
        for (const attachment of imageAttachments) {
            content.push({ type: 'image_url', image_url: { url: attachment.largeSizeUrl! } });
        }
        for (const attachment of stickerAttachments) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: attachment.imagesWithBackground[attachment.imagesWithBackground.length - 1].url
                }
            });
        }
        return content;
    }

    // todo forwarded images are not visible
    private async vkMessageToString(message: VkMessage): Promise<string> {
        const user = await this.context.vkUsersService.getUser(+message.fromId);
        const displayName = user ? (user.firstNameCached + " " + user.lastNameCached) : "(unknown)";
        const date = new Date(message.timestamp * 1000);

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');

        const time = `${day}.${month}.${year} ${hour}:${minute}`;

        let result = '';

        result += "<|FORWARDED_MESSAGES|>\n";
        for (const forwardedMessage of message.forwardedMessages) {
            result += await this.vkMessageToString(forwardedMessage);
        }
        result += "<|FORWARDED_MESSAGES_END|>\n";

        if (+message.fromId != -this.context.configService.getAppConfig().vkGroupId) {
            result += `<|MESSAGE_METADATA user_id="${message.fromId}" user_name="${displayName}" time="${time}"|>\n`;
        }

        if (message.text != null)
            result += message.text + "\n";
        for (const attachment of message.attachments) {
            if (attachment.type == "audio_message") {
                const audioMessage = attachment as AudioMessageAttachment
                const transcript = this.escapeXml(audioMessage.transcript || null);
                result += `<|AUDIO_MESSAGE transcript="${transcript}"|>\n`;
            } else if (attachment.type == "photo") {
                const photo = attachment as PhotoAttachment;
                result += `<|PHOTO id="${photo.id}"|>\n`;
            } else if (attachment.type == "sticker") {
                const sticker = attachment as StickerAttachment;
                result += `<|STICKER id="${sticker.id}" pack-id="${sticker.productId}"|>\n`;
            } else {
                result += `<|ATTACHMENT type="${attachment.type}"|>\n`;
            }
        }

        return result;
    }

    private async handleNotEnoughCredits(message: VkMessage) {
        const { vkMessagesService, usagePlanService } = this.context;
        const secondsRequired = await usagePlanService.getTimeInSecondsRequiredToHaveCredits(message.fromId, 1);
        const messageTemplate = "Слишком много сообщений, пожалуйста подожди ";
        if (secondsRequired <= 0) {
            await vkMessagesService.send(message.peerId, messageTemplate + `15 секунд`);
            return;
        }
        if (secondsRequired == Number.POSITIVE_INFINITY) {
            await vkMessagesService.send(
                message.peerId,
                `У [id${Math.abs(message.fromId)}|тебя] достигнут лимит сообщений, нужно пополнить`
            );
            return
        }
        if (secondsRequired < 60) {
            await vkMessagesService.send(message.peerId, messageTemplate + `${secondsRequired} с.`);
            return;
        }
        if (secondsRequired < 60*60) { // minutes
            const minutesRequired = Math.ceil(secondsRequired/60);
            await vkMessagesService.send(message.peerId, messageTemplate + `${minutesRequired} м.`);
            return;
        }
        if (secondsRequired < 60*60*24) { // hours
            const hoursRequired = Math.floor(secondsRequired/60/60);
            const minutesRequired = Math.ceil(secondsRequired/60) - hoursRequired*60;
            await vkMessagesService.send(message.peerId, messageTemplate + `${hoursRequired} ч. ${minutesRequired} м.`);
            return;
        }
        const daysRequired = Math.floor(secondsRequired/60/60/24);
        const hoursRequired = Math.floor(secondsRequired/60/60) - daysRequired*24;
        const minutesRequired = Math.ceil(secondsRequired/60) - hoursRequired*60 - daysRequired*24*60;
        await vkMessagesService.send(
            message.peerId,
            messageTemplate + `${daysRequired} д. ${hoursRequired} ч. ${minutesRequired} м.`
        );
        return;
    }

    private escapeXml(unsafe: string | null) {
        if (unsafe == null)
            return null;
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
            return c;
        });
    }
}
