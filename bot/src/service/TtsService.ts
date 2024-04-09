import ConfigService from "./ConfigService";
import {Context} from "../Context";
import axios, {AxiosRequestConfig} from "axios";
import {createOpenAiWrapperError} from "../util/OpenAiUtil";

export default class TtsService {
    private config!: ConfigService;
    private jsonMediaType = "application/json; charset=utf-8";
    private apiKey!: string;

    constructor(context: Context) {
        context.onReady(() => {
            this.config = context.configService!;
            this.apiKey = this.config.requireEnv('OPENAI_SECRET_KEY');
        });
    }

    async generateSpeech(text: string, model: string, voice: string): Promise<Buffer> {
        const apiUrl = "https://api.openai.com/v1/audio/speech";
        const config: AxiosRequestConfig = {
            ...this.createAxiosConfig(),
            responseType: 'arraybuffer'
        };
        const body: any = {};
        body['model'] = model;
        body['input'] = text;
        body['voice'] = voice;
        body['response_format'] = 'opus';
        try {
            const response = await axios.post(apiUrl, body, config);
            return Buffer.from(response.data);
        } catch (e) {
            throw createOpenAiWrapperError(e);
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