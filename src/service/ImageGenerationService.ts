import ConfigService from "service/ConfigService";
import axios, {AxiosError, AxiosResponse} from "axios";
import FormData from "form-data";
import {Context} from "../Context";

export default class ImageGenerationService {
    private config!: ConfigService;
    constructor(private context: Context) {
        context.onReady(() => {
            this.config = this.context.configService;
        });
    }

    private generationsApiUrl = "https://api.openai.com/v1/images/generations";
    private variationsApiUrl = "https://api.openai.com/v1/images/variations";
    private editsApiUrl = "https://api.openai.com/v1/images/edits";
    private jsonMediaType = "application/json; charset=utf-8";

    async generateImage(prompt: string): Promise<string> {
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
            const response = await axios.post(this.generationsApiUrl, body, config);
            return this.extractSingleImageUrl(response);
        } catch (e: unknown) {
            console.log(e);
            throw this.createWrapperError(e);
        }
    }

    async generateImageVariations(imageBuffer: Buffer, variationsNum: number): Promise<string[]> {
        const key = this.config.getEnv('OPENAI_SECRET_KEY');
        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: 'image.png',
            contentType: 'image/png',
        });
        form.append('n', variationsNum);

        const config = {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${key}`
            }
        };

        try {
            const response = await axios.post(this.variationsApiUrl, form, config);
            return this.extractImageUrls(response);
        } catch (e: unknown) {
            console.log(e);
            throw this.createWrapperError(e);
        }
    }

    async editImage(buffer: Buffer, prompt: string): Promise<string> {
        const key = this.config.getEnv('OPENAI_SECRET_KEY');
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
            throw this.createWrapperError(e);
        }
    }

    private createWrapperError(e: unknown) {
        if (axios.isAxiosError(e)) {
            const axiosError = e as AxiosError
            if (axiosError.response && axiosError.response.data) {
                const data = axiosError.response.data as any;
                const message = data.error.message || axiosError.message;
                return new Error("OpenAI: " + message)
            } else {
                return new Error("API call failed: " + axiosError.message)
            }
        } else if (e instanceof Error) {
            const error = e as Error
            return new Error("Service call failed: " + error.message)
        } else {
            return new Error("Unknown problem, please check logs")
        }
    }

    private extractSingleImageUrl(response: AxiosResponse): string {
        return response.data['data'][0]['url'];
    }

    private extractImageUrls(response: AxiosResponse): string[] {
        return response.data['data'].map((it: { url: string }) => it.url);
    }
}