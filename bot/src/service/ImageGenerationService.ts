import ConfigService from "service/ConfigService";
import axios, {AxiosResponse} from "axios";
import FormData from "form-data";
import {Context} from "../Context";
import {createOpenAiWrapperError} from "../util/OpenAiUtil";

export default class ImageGenerationService {
    private config!: ConfigService;
    constructor(private context: Context) {
        context.onReady(() => {
            this.config = this.context.configService;
        });
    }

    private generationsApiUrl = "https://api.openai.com/v1/images/generations";
    private editsApiUrl = "https://api.openai.com/v1/images/edits";
    private jsonMediaType = "application/json; charset=utf-8";

    async generateImages(prompt: string): Promise<string[]> {
        const key = this.config.getAppConfig().openAiSecretKey;
        const config = {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': this.jsonMediaType
            }
        }
        const body: any = {};
        body['prompt'] = prompt;
        body['model'] = 'dall-e-3';
        body['size'] = "1024x1024";

        try {
            const response = await axios.post(this.generationsApiUrl, body, config);
            return this.extractImageUrls(response);
        } catch (e: unknown) {
            console.log(e);
            throw createOpenAiWrapperError(e);
        }
    }

    async editImage(buffer: Buffer, prompt: string): Promise<string> {
        const key = this.config.getAppConfig().openAiSecretKey;
        const form = new FormData();
        form.append('image', buffer, {
            filename: 'image.png',
            contentType: 'image/png',
        });
        form.append('prompt', prompt);

        const config = {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${key}`
            }
        };

        try {
            const response = await axios.post(this.editsApiUrl, form, config);
            return this.extractSingleImageUrl(response);
        } catch (e: unknown) {
            console.log(e);
            throw createOpenAiWrapperError(e);
        }
    }

    private extractSingleImageUrl(response: AxiosResponse): string {
        return response.data['data'][0]['url'];
    }

    private extractImageUrls(response: AxiosResponse): string[] {
        return response.data['data'].map((it: { url: string }) => it.url);
    }
}