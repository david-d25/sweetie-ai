import {CompletionMessageDto} from "../service/ChatGptService";

type WrappedMessage = {
    message: CompletionMessageDto;
    hard: boolean;
}

export default class GptChatHistoryBuilder {
    private tokenLimit = 0;
    private systemMessage: string | null = null;
    private wrappedMessages: WrappedMessage[] = [];
    private tools: object[] = [];
    private readonly tokenCounter: (text: string) => number;

    constructor(tokenCounter: (text: string) => number) {
        this.tokenCounter = tokenCounter;
    }

    setTokenLimit(limit: number) {
        this.tokenLimit = limit;
    }

    setSystemMessage(text: string) {
        this.systemMessage = text;
    }

    setTools(tools: object[]) {
        this.tools = tools;
    }

    addSoftMessage(message: CompletionMessageDto) {
        this.wrappedMessages.push({
            message,
            hard: false
        });
    }

    addHardMessage(message: CompletionMessageDto) {
        this.wrappedMessages.push({
            message,
            hard: true
        });
    }

    build(): CompletionMessageDto[] {
        const resultWrapped: WrappedMessage[] = [];

        if (this.systemMessage) {
            resultWrapped.push({
                message: {
                    role: "system",
                    content: this.systemMessage
                },
                hard: true
            });
        }

        for (const wrapped of this.wrappedMessages) {
            resultWrapped.push(wrapped);
        }

        const toolsTokenCount = this.tokenCounter(JSON.stringify(this.tools));

        const countTokens = () => {
            const resultWrappedNoImages = [];
            for (const wrapped of resultWrapped) {
                if (wrapped.message.role === "user") {
                    const userMessage = wrapped.message.content as any;
                    if (Array.isArray(userMessage)) {
                        const userMessageNoImages = userMessage.filter(it => it.type !== "image_url");
                        resultWrappedNoImages.push({
                            message: {
                                role: "user",
                                content: userMessageNoImages
                            },
                            hard: wrapped.hard
                        });
                    } else {
                        resultWrappedNoImages.push(wrapped);
                    }
                } else {
                    resultWrappedNoImages.push(wrapped);
                }
            }
            let result = this.tokenCounter(JSON.stringify(resultWrappedNoImages)) + toolsTokenCount;
            for (const wrapped of resultWrapped) {
                // count images
                if (wrapped.message.role === "user") {
                    const userMessage = wrapped.message.content as any;
                    if (Array.isArray(userMessage)) {
                        for (const item of userMessage) {
                            if (item.type === "image_url") {
                                result += 765; // assuming 765 tokens per image
                            }
                        }
                    }
                }
            }
            return result;
        }

        while (countTokens() > this.tokenLimit) {
            const firstSoftMessageIndex = resultWrapped.findIndex(it => !it.hard);
            if (firstSoftMessageIndex === -1) {
                break;
            }

            resultWrapped.splice(firstSoftMessageIndex, 1);
        }

        return resultWrapped.map(it => it.message);
    }
}