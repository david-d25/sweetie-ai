import axios from "axios";
import ConfigService from "service/ConfigService";
import {Context} from "../Context";
import GPT4Tokenizer from "gpt4-tokenizer";
import {createOpenAiWrapperError} from "../util/OpenAiUtil";

export type OpenAiModel = {
    id: string,
    created: number,
    ownedBy: string,
}

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
        systemMessage: string,
        chatMessages: {
            role: string,
            name?: string,
            content: string | object
        }[],
        model: string,
        maxTokens: number,
        temperature: number,
        topP: number,
        frequencyPenalty: number,
        presencePenalty: number
    ): Promise<string> {
        const apiUrl = "https://api.openai.com/v1/chat/completions";
        const messages = [];

        messages.push({
            role: "system",
            content: systemMessage
        });

        chatMessages.forEach(message => {
            messages.push({
                role: message.role,
                name: message.name,
                content: message.content
            });
        });

        const body: any = {};
        body['messages'] = messages;
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
            return response.data['choices'][0]['message']['content'];
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
        if (model.startsWith('gpt-4') || model.startsWith('gpt-3.5') || model.startsWith('ft:gpt-4') || model.startsWith('ft:gpt-3.5')) {
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