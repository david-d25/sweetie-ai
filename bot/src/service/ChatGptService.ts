import axios, {AxiosResponse} from "axios";
import ConfigService from "service/ConfigService";
import {Context} from "../Context";
import {AxiosError} from "axios/index";

export default class ChatGptService {

    private config!: ConfigService;

    constructor(context: Context) {
        context.onReady(() => {
            this.config = context.configService!;
        });
    }

    private apiUrl = "https://api.openai.com/v1/chat/completions";
    private jsonMediaType = "application/json; charset=utf-8";

    async request(
        systemMessage: string,
        chatMessages: {
            role: string,
            name?: string,
            content: string
        }[],
        model: string,
        maxTokens: number,
        temperature: number,
        topP: number,
        frequencyPenalty: number,
        presencePenalty: number
    ): Promise<string> {
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

        const key = this.config.getEnv('OPENAI_SECRET_KEY');
        const config = {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': this.jsonMediaType
            }
        }

        try {
            const response = await axios.post(this.apiUrl, body, config);
            return  this.parseResponse(response);
        } catch (e) {
            if (axios.isAxiosError(e)) {
                const axiosError = e as AxiosError
                if (axiosError.response && axiosError.response.data) {
                    const data = axiosError.response.data as any;
                    const message = data.error.message || axiosError.message;
                    throw new Error("OpenAI: " + message)
                } else {
                    throw new Error("API call failed: " + axiosError.message)
                }
            } else if (e instanceof Error) {
                const error = e as Error
                throw new Error("Service call failed: " + error.message)
            } else {
                throw new Error("Unknown problem, please check logs")
            }
        }
    }

    private parseResponse(response: AxiosResponse): string {
        return response.data['choices'][0]['message']['content'];
    }
}