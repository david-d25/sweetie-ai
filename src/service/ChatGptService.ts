import axios, {AxiosResponse} from "axios";
import ConfigService from "service/ConfigService";

export default class ChatGptService {
    constructor(
        private config: ConfigService
    ) {}

    private apiUrl = "https://api.openai.com/v1/chat/completions";
    private jsonMediaType = "application/json; charset=utf-8";

    async request(
        systemMessage: string,
        chatMessages: {
            role: string,
            name?: string,
            content: string
        }[],
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
        body['model'] = 'gpt-3.5-turbo-16k';
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

        let result = "";
        try {
            const response = await axios.post(this.apiUrl, body, config);
            result = this.parseResponse(response);
        } catch (e) {
            console.error(e);
        }
        return result;
    }

    private parseResponse(response: AxiosResponse): string {
        return response.data['choices'][0]['message']['content'];
    }
}