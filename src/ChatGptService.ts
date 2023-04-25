import axios, {AxiosResponse} from "axios";
import ConfigService from "./ConfigService";

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
            name: string | null,
            content: string
        }[]
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
        body['model'] = 'gpt-3.5-turbo';
        body['max_tokens'] = 256;
        body['temperature'] = 0.75;
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