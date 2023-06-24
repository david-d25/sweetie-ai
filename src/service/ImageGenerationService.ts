import ConfigService from "service/ConfigService";
import axios, {AxiosResponse} from "axios";

export default class ImageGenerationService {
    constructor(
        private config: ConfigService
    ) {}

    private apiUrl = "https://api.openai.com/v1/images/generations";
    private jsonMediaType = "application/json; charset=utf-8";

    async request(prompt: string): Promise<string | null> {
        const key = this.config.getEnv('OPENAI_SECRET_KEY');
        const config = {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': this.jsonMediaType
            }
        }
        const body: any = {};
        body['prompt'] = prompt;

        try {
            const response = await axios.post(this.apiUrl, body, config);
            return this.extractImageUrl(response);
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    private extractImageUrl(response: AxiosResponse): string {
        return response.data['data'][0]['url'];
    }
}