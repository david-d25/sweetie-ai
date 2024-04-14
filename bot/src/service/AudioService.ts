import ConfigService from "./ConfigService";
import {Context} from "../Context";
import axios, {AxiosRequestConfig} from "axios";
import {createOpenAiWrapperError} from "../util/OpenAiUtil";
import FormData from "form-data";

export default class AudioService {
    private config!: ConfigService;
    private jsonMediaType = "application/json; charset=utf-8";
    private apiKey!: string;

    constructor(context: Context) {
        context.onReady(() => {
            this.config = context.configService!;
            this.apiKey = this.config.requireEnv('OPENAI_SECRET_KEY');
        });
    }

    async generateSpeech(text: string, model: string, voice: string, speed: number = 1): Promise<Buffer> {
        const apiUrl = "https://api.openai.com/v1/audio/speech";
        const config: AxiosRequestConfig = {
            ...this.createAxiosConfig(),
            responseType: 'arraybuffer'
        };
        const body: any = {};
        body['model'] = model;
        body['input'] = text;
        body['voice'] = voice;
        body['speed'] = speed;
        body['response_format'] = 'opus';
        try {
            const response = await axios.post(apiUrl, body, config);
            return Buffer.from(response.data);
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async createTranscript(file: Buffer, model: string): Promise<string> {
        const apiUrl = "https://api.openai.com/v1/audio/transcriptions";
        const form = new FormData();
        form.append('file', file, {
            filename: 'audio.mp3',
            contentType: 'audio/mpeg',
        });
        form.append('model', model);
        const config = {
            headers: {
                ...form.getHeaders(),
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${this.apiKey}`
            }
        };
        try {
            const response = await axios.post(apiUrl, form, config);
            return response.data['text'];
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