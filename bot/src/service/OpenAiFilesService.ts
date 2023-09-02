import {Context} from "../Context";
import ConfigService from "./ConfigService";
import axios from "axios";
import {createOpenAiWrapperError} from "../util/OpenAiUtil";
import FormData from "form-data";

type FileStatus = "uploaded" | "processing" | "pending" | "error" | "deleting" | "deleted";

export type OpenAiFile = {
    id: string;
    sizeBytes: number;
    createdAt: Date;
    name: string;
    purpose: string;
    status: FileStatus;
    statusDetails: string | null;
};

export default class OpenAiFilesService {
    private config!: ConfigService;
    private apiKey!: string;

    constructor(context: Context) {
        context.onReady(() => {
            this.config = context.configService!;
            this.apiKey = this.config.requireEnv('OPENAI_SECRET_KEY');
        });
    }

    async listFiles(): Promise<OpenAiFile[]> {
        const apiUrl = "https://api.openai.com/v1/files";
        const config = this.createAxiosJsonConfig();

        try {
            const response = await axios.get(apiUrl, config);
            return response.data['data'].map(
                (object: { [key:string]: any }) => this.toOpenAiFileModel(object)
            );
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async uploadFile(filename: string, data: Buffer, purpose: string): Promise<OpenAiFile> {
        const apiUrl = "https://api.openai.com/v1/files";
        const form = new FormData();
        form.append('file', data, {
            filename: filename,
        });
        form.append('purpose', purpose);
        const config = this.createAxiosFormConfig(form.getHeaders());

        try {
            const response = await axios.post(apiUrl, form, config);
            return this.toOpenAiFileModel(response.data);
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async deleteFile(fileId: string): Promise<boolean> {
        const apiUrl = "https://api.openai.com/v1/files/" + fileId;
        const config = this.createAxiosJsonConfig();

        try {
            const response = await axios.delete(apiUrl, config);
            return response.data['deleted'] == 'true';
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async getFile(fileId: string): Promise<OpenAiFile> {
        const apiUrl = "https://api.openai.com/v1/files/" + fileId;
        const config = this.createAxiosJsonConfig();
        try {
            const response = await axios.get(apiUrl, config);
            return this.toOpenAiFileModel(response.data);
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    async getFileContent(fileId: string): Promise<Buffer> {
        const apiUrl = "https://api.openai.com/v1/files/" + fileId + "/content";
        const config = this.createAxiosJsonConfig({
            responseType: 'arraybuffer'
        });
        try {
            const response = await axios.get(apiUrl, config);
            return Buffer.from(response.data, 'binary');
        } catch (e) {
            throw createOpenAiWrapperError(e);
        }
    }

    private createAxiosFormConfig(headers: { [key:string]: string } = {}): object {
        return {
            headers: {
                ...headers,
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${this.apiKey}`
            }
        };
    }

    private createAxiosJsonConfig(headers: { [key:string]: string } = {}): object {
        return {
            headers: {
                ...headers,
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': "application/json; charset=utf-8"
            }
        };
    }

    private toOpenAiFileModel(object: { [key:string]: any }): OpenAiFile {
        return {
            id: object['id'],
            sizeBytes: object['bytes'],
            createdAt: new Date(object['created_at'] * 1000),
            name: object['filename'],
            purpose: object['purpose'],
            status: object['status'],
            statusDetails: object['status_details']
        }
    }
}