import axios from "axios";
import ConfigService from "service/ConfigService";
import {Context} from "../Context";
import GPT4Tokenizer from "gpt4-tokenizer";
import {createOpenAiWrapperError} from "../util/OpenAiUtil";
import {AssistantObject} from "../gpt/tool/function/AssistantFunction";

export type OpenAiModel = {
    id: string;
    created: number;
    ownedBy: string;
}

export type CompletionResponse = {
    content: string | null;
    toolCalls: CompletionToolCallDto[];
}

export type CompletionToolCallDto = {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    }
}

export type FunctionDescriptorDto = {
    name: string;
    description: string;
    parameters?: AssistantObject;
}

export type CompletionSystemMessageDto = {
    role: "system";
    content: string;
}
export type CompletionUserMessageDto = {
    role: "user";
    name?: string;
    content: string | CompletionUserMessageContentItemDto[];
}
export type CompletionUserMessageContentItemDto = CompletionUserMessageTextContentItemDto
    | CompletionUserMessageImageUrlContentItemDto;
export type CompletionUserMessageTextContentItemDto = {
    type: "text";
    text: string;
}
export type CompletionUserMessageImageUrlContentItemDto = {
    type: "image_url";
    image_url: { url: string };
}
export type CompletionAssistantMessageDto = {
    role: "assistant";
    content: string | null;
    tool_calls?: CompletionToolCallDto[];
}
export type CompletionToolMessageDto = {
    role: "tool";
    content: string;
    tool_call_id: string;
}
export type CompletionMessageDto = CompletionSystemMessageDto
    | CompletionUserMessageDto
    | CompletionAssistantMessageDto
    | CompletionToolMessageDto;

export default class ChatGptService {
    private config!: ConfigService;
    private jsonMediaType = "application/json; charset=utf-8";
    private apiKey!: string;
    private gpt4Tokenizer = new GPT4Tokenizer({ type: "gpt4" });

    constructor(context: Context) {
        context.onReady(() => {
            this.config = context.configService!;
            this.apiKey = this.config.requireEnv('OPENAI_SECRET_KEY');
        });
    }

    async request(
        messages: CompletionMessageDto[],
        functions: FunctionDescriptorDto[],
        model: string,
        maxTokens: number,
        temperature: number,
        topP: number,
        frequencyPenalty: number,
        presencePenalty: number
    ): Promise<CompletionResponse> {
        const apiUrl = "https://api.openai.com/v1/chat/completions";

        const tools = functions.map(f => {
            return {
                "type": "function",
                "function": f
            }
        });

        const body: any = {};
        body['messages'] = messages;
        body['tools'] = tools;
        body['model'] = model;
        body['max_tokens'] = maxTokens;
        body['temperature'] = temperature;
        body['top_p'] = topP;
        body['frequency_penalty'] = frequencyPenalty;
        body['presence_penalty'] = presencePenalty;
        body['n'] = 1;

        const config = this.createAxiosConfig();

        try {
            const response = await axios.post(apiUrl, body, config);
            return {
                content: response.data['choices'][0]['message']['content'],
                toolCalls: response.data['choices'][0]['message']['tool_calls']
            };
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async requestListModels(): Promise<OpenAiModel[]> {
        const apiUrl = "https://api.openai.com/v1/models";
        const config = this.createAxiosConfig();
        try {
            const response = await axios.get(apiUrl, config);
            const models: OpenAiModel[] = response.data['data'].map((dto: any) => {
                return {
                    id: dto['id'],
                    created: dto['created'],
                    ownedBy: dto['owned_by']
                }
            });
            return models.filter(model => /(^gpt|^ft:gpt)/.test(model.id));
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async requestDeleteModel(modelId: string): Promise<boolean> {
        const apiUrl = "https://api.openai.com/v1/models/" + modelId;
        const config = this.createAxiosConfig();
        try {
            const response = await axios.delete(apiUrl, config);
            return response.data['deleted'] == true;
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    estimateTokensCount(model: string, message: string): number {
        if (model.startsWith('gpt-4')
            || model.startsWith('gpt-3.5')
            || model.startsWith('ft:gpt-4')
            || model.startsWith('ft:gpt-3.5')
        ) {
            return this.gpt4Tokenizer.estimateTokenCount(message);
        } else {
            return message.length;
        }
    }

    private createAxiosConfig(): object {
        return {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': this.jsonMediaType
            }
        };
    }
}